/*
    Инициализация сервера
*/
//Подключение внешних зависимостей
const express = require("express");
const socketio = require("socket.io");
const config = require("config");
const router = require("./router");
const bodyParser = require("body-parser");
const CryptoJS = require("crypto-js");
const cors = require('cors');
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  getUsersInRoomAndName,
} = require("./users");
const mongoClient = require("mongodb").MongoClient;

var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

//Настройка сервера из config файла
const oneseLoadedMessage = config.onesLoadedMessage; //Количество подгружаемих сообщений за раз;
const url = config.databaseUrlMIX; //Ссылка на подключение к базе данных;

//Переменние для работи с БД
var roombase; //Переменная подключение к базе сообщений;
var userbase; //Переменная подключение к базе непрочитанних сообщений пользователя;;

//Установка соиденения с базой данных
mongoClient.connect(
  url,
  { useUnifiedTopology: true },
  async function (err, db) {
    if (err) {
      throw err;
    }
    roombase = await db.db("Rooms");
    userbase = await db.db("Users");
  }
);

/*
    Настройка веб сервера
*/
//Получение SSL сертификата
function httpsWorker(glx) {
  const app = express();
  var server = glx.httpsServer();
  const io = socketio(server);
  //app.use(cors);
  app.use(router);
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use("/files", express.static("public"));
  glx.serveApp(app);

  /*
    Обработка событий socket.io
  */
  io.on("connection", (socket) => {
    /*
        Обработка запроса на подключение нового пользователя
    */
    socket.on("join", async ({ name, room_id, secret }, callback) => {
      //Проверка пользователя по ключу
      let hmac = CryptoJS.HmacSHA256(name + room_id, "UV/LED").toString(
        CryptoJS.enc.Hex
      ); //Генерация проверочного кода
      if (hmac !== secret) {
        //Сравнение сгенерированного и полученного кодов
        callback(new Error("Invalid key")); //Отказ в доступе к комнате
        return;
      }

      const { error, user } = addUser({ id: socket.id, name, room: room_id }); //Сохранение данных пользователя
      let Message = roombase.collection(room_id); //Получение списка сообщений конкретной комнаты
      if (error) return callback(error);

      //Получение и отправка первого пакета сообщений
      let colOfMessage = await Message.countDocuments();
      let col = colOfMessage;
      let messages;
      if (col <= oneseLoadedMessage) {
        messages = await Message.find().limit(col).toArray();
        col = 0;
      } else {
        col -= oneseLoadedMessage;
        messages = await Message.find()
          .limit(oneseLoadedMessage)
          .skip(col)
          .toArray();
      }
      socket.emit("display-chat", { messages, col });

      socket.join(user.room); //Добовляем вользователя в комату сокета;

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      }); //Отправка остальным пользователям информацию о новом клиенте в комнате

      resetOpend(true); //Задаем откритое состояние окна(для подсчета количества непрочитанних сообщений)
      callback();
    });



    /*
        Обработка нового собщения
    */
    socket.on("sendMessage", async ({ message, messageType }, callback) => {
      const user = getUser(socket.id); //Получаем отправителя
      let currDate = new Date(); //Время получения сообщения

      let serverMesage = {
        name: user.name,
        text: message,
        messageType: messageType,
        sendDate: currDate,
      }; //Данные для занесения в БД
      await roombase
        .collection(user.room)
        .insertOne(serverMesage, function () {}); //Запись в БД

      //Уведомить пользователей о новом сообщении
      let Message = await roombase.collection(user.room);
      let users = clients.filter((client) => client.room === user.room);
      let colOfMessage = await Message.countDocuments();
      users.forEach(async (element) => {
          let unr = await countUnreaded(
            element.username,
            element.room,
            colOfMessage
          );
          const data = `data: ${JSON.stringify(unr)}\n\n`;
          element.res.write(data);
      });

      //Отправить текст собщения остальным пользователям
      io.to(user.room).emit("message", {
        user: user.name,
        text: message,
        type: messageType,
        date: currDate,
      });

      callback();
    });

    /*
      Обработка событий socket.io
    */
    socket.on("setOpend", async ({ status }) => {
      resetOpend(status);
    });

    const resetOpend = async (status) => {
      const user = getUser(socket.id);
      //user.opend = status;
      await saveReadedMsa(user.name, user.room);
    };

    /*
    Обработка событий socket.io
*/
    const saveReadedMsa = async (name, room) => {
      let col = await roombase.collection(room).countDocuments();
      let serverMesage = {
        lastread: col,
      };

      await userbase
        .collection(name + " in " + room)
        .findOneAndUpdate({}, { $set: serverMesage }, function () {});
    };

    /*
    Обработка событий socket.io
*/
    socket.on("load-old", async (col) => {
      const user = getUser(socket.id);
      let Message = roombase.collection(user.room);
      let message;
      if (col <= oneseLoadedMessage) {
        message = await Message.find().limit(col).toArray();
        col = 0;
      } else {
        col -= oneseLoadedMessage;
        message = await Message.find()
          .limit(oneseLoadedMessage)
          .skip(col)
          .toArray();
      }

      socket.emit("loaded-old-message", { message, col });
    });

    /*
    Обработка событий socket.io
*/
    socket.on("disconnect", async () => {
      const user = removeUser(socket.id);

      if (user) {
        if (user.opend) {
          await saveReadedMsa(user.name, user.room);
        }

        io.to(user.room).emit("roomData", {
          room: user.room,
          users: getUsersInRoom(user.room),
        });
      }
    });
  });

  app.post("/sendServiceMessage",async (req, res) => {
    var CryptoJS = require("crypto-js");
    let hmac = CryptoJS.HmacSHA256(
      req.body.name + req.body.room + req.body.message,
      "UV/LED"
    ).toString(CryptoJS.enc.Hex);

    if (req.body.secret === hmac) {
      let currDate = new Date();
      let serverMesage = {
        name: req.body.name,
        text: req.body.message,
        messageType: "text",
        sendDate: currDate,
      };
      await roombase
        .collection(req.body.room)
        .insertOne(serverMesage, function () {});
      io.to(req.body.room).emit("message", {
        user: req.body.name,
        text: req.body.message,
        type: "text",
        date: currDate,
      });

      res.status(204).send();
    }
    res.status(400).send();
  });

  let clients = [];

  app.get("/stream/:name&:room",cors(corsOptions), async function (req, res) {
    const headers = {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    };
    res.writeHead(200, headers);
    res.write("\n");

    const clientId = Date.now();
    const newClient = {
      id: clientId,
      room: req.params.room,
      username: req.params.name,
      res: res,
    };
    clients.push(newClient);
    const intervalId = setInterval(() => {
      res.flushHeaders();
    }, 60 * 1000);
    let unr = await countUnreaded(req.params.name, req.params.room);
    const data = `data: ${JSON.stringify(unr)}\n\n`;
    res.write(data);
    req.on("close", () => {
      clients = clients.filter((c) => c.id !== clientId);
      clearInterval(intervalId);
    });
  });

  const countUnreaded = async (name, room, max) => {
    let Message = await roombase.collection(room);
    let User = await userbase.collection(name + " in " + room);

    let colOfMessage = max ? max : await Message.countDocuments();
    let col = colOfMessage;
    let userInfo = await User.findOne();
    if (!userInfo) {
      let serverMesage = {
        lastread: col,
      };
      await User.insertOne(serverMesage, function () {});

      return 0;
    } else {
      userInfo = userInfo.lastread;
      let unreaded = colOfMessage - userInfo;
      return unreaded;
    }
  };
}
module.exports = httpsWorker;
