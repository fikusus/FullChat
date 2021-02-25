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
const cors = require("cors");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");
const mongoClient = require("mongodb").MongoClient;

var corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};
let clients = [];
var roombase; //Переменная подключение к базе сообщений;
var userbase; //Переменная подключение к базе непрочитанних сообщений пользователя;;

//Настройка сервера из config файла
const oneseLoadedMessage = config.onesLoadedMessage; //Количество подгружаемих сообщений за раз;
const url = config.databaseUrlMIX; //Ссылка на подключение к базе данных;

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

      await sendingMessage(user.name, user.room, message, messageType);

      //Уведомляем отправителя об успешной отправке
      callback();
    });

    /*
      Обработка смены состояния модального окна
    */
    socket.on("setOpend", async ({ status }) => {
      resetOpend(status);
    });

    /*
      Задание состояния модального окна
    */
    const resetOpend = async (status) => {
      const user = getUser(socket.id);
      user.opend = status;
      await saveReadedMsa(user.name, user.room);
    };

    /*
      Сброс количества непрочитанних сообщений
    */
    const saveReadedMsa = async (name, room) => {
      let col = await roombase.collection(room).countDocuments(); //Получаем количество сообщений в комнате
      let serverMesage = {
        username: name,
        room: room,
        lastread: col,
      }; //Данные для сохранения
      await userbase
        .collection("user_unreaded_messages")
        .findOneAndUpdate(
          { username: name, room: room },
          { $set: serverMesage }
        ); //Запись в БД
    };

    /*
      Подгрузка нового блока старых сообщений
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
      Отключение пользователя
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

  const sendingMessage = async ( username, room, message, type ) => {
    let currDate = new Date(); //Время получения сообщения

    let serverMesage = {
      name: username,
      text: message,
      type: type,
      date: currDate,
    }; //Данные для занесения в БД
    console.log(serverMesage);
    await roombase.collection(room).insertOne(serverMesage, function () {}); //Запись в БД

    //Уведомить пользователей о новом сообщении
    let Message = await roombase.collection(room);
    let users = clients.filter((client) => client.room === room);
    let colOfMessage = await Message.countDocuments();
    users.forEach(async (element) => {
      await countUnreaded(
        element.username,
        element.room,
        colOfMessage,
        element.res
      );
    });

    //Отправить текст собщения остальным пользователям
    io.to(room).emit("message", serverMesage);
  };

  app.post("/sendServiceMessage", async (req, res) => {
    var CryptoJS = require("crypto-js");
    let hmac = CryptoJS.HmacSHA256(
      req.body.name + req.body.room + req.body.message,
      "UV/LED"
    ).toString(CryptoJS.enc.Hex);

    if (req.body.secret === hmac) {
      await sendingMessage(
        req.body.name,
        req.body.room,
        req.body.message,
        "text"
      );
      res.status(204).send();
    } else {
      res.status(400).send();
    }
  });

  app.get("/stream/:name&:room", cors(corsOptions), async function (req, res) {
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

    await countUnreaded(req.params.name, req.params.room,null , res);

    req.on("close", () => {
      clients = clients.filter((c) => c.id !== clientId);
      clearInterval(intervalId);
    });
  });

  const countUnreaded = async (name, room, max, receiver) => {
    let unreaded;
    let Message = roombase.collection(room);
    let User = userbase.collection("user_unreaded_messages");

    let colOfMessage = max ? max : await Message.countDocuments();
    let col = colOfMessage;
    let userInfo = await User.findOne({ username: name, room: room });

    console.log(userInfo);

    if (!userInfo) {
      let serverMesage = {
        username: name,
        room: room,
        lastread: col,
      };
      await User.insertOne(serverMesage, function () {});
      unreaded = 0;
    } else {
      userInfo = userInfo.lastread;
      unreaded = colOfMessage - userInfo;
    }

    const data = `data: ${JSON.stringify(unreaded)}\n\n`;
    receiver.write(data);
  };
}
module.exports = httpsWorker;
