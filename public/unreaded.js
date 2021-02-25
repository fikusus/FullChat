let base_link = "https://chat.tss2020.site/client/";
let button_id = document.currentScript.getAttribute("data-chat-id");
let parametrs = JSON.parse(
  document.currentScript.getAttribute("data-chat-options")
);

let out_link =
  base_link +
  "?name=" +
  parametrs.person +
  "&room=" +
  parametrs.room.replace("'", '`').replace('"', '`')  +
  "&room_id=" +
  parametrs.room_id +
  "&secret=" +
  parametrs.room_key;

var name = parametrs.person;
var room = parametrs.room_id;

function getCookie(name) {
  let matches = document.cookie.match(
    new RegExp(
      "(?:^|; )" +
        name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") +
        "=([^;]*)"
    )
  );
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

let unreaded = getCookie("unreaded-chat-message");

if (!unreaded) {
  unreaded = 0;
}

let head = window.document.getElementsByTagName("head")[0];

let aFile = "https://chat.tss2020.site/files/modalStyle.css";
let astyle = window.document.createElement("link");
astyle.href = aFile;
astyle.rel = "stylesheet";
head.appendChild(astyle);

let button_main = document.getElementById(button_id);
button_main.innerHTML =
  " <div class='fixed-action-btn chat badgetalized' id='open-modal-chat-btn' data-badge='" +
  unreaded +
  "'><a  href='#demo-modal' class='btn-floating modal-trigger btn-large red'><i class='material-icons'>mode_comment</i></a></div>";

let div_btn = document.getElementById("open-modal-chat-btn");

let cliked_times = 0;
$("#" + button_id).on("click", function () {
  if (cliked_times === 0) {
    let div = document.createElement("div");
    div_btn.setAttribute("data-badge", "0");
    div.className = "chat modal";
    div.id = "demo-modal";
    div.innerHTML =
      "<div class='modal-content'>" +
      "<p class='modal-action modal-close' id = 'close-modal-btn'><span class='material-icons'> clear</span></p>" +
      "<iframe id='chat-iframe'  src='" +
      out_link +
      "'  frameborder='0'></iframe></div>";
    document.getElementsByClassName("container")[0].append(div);
    $(".modal").modal({
      complete: onModalHide,
      ready: onModalOpen,
    });
    cliked_times++;
  } else {
    document.getElementById("demo-modal").style.width = "468px";
  }
});

reconnect();

function saveInCookie(result) {
  if (result !== unreaded) {
    div_btn.setAttribute("data-badge", result);
    document.cookie = "unreaded-chat-message=" + result;
  }
}

function reconnect() {
  eventSource = new EventSource(
    "https://chat.tss2020.site/stream/" + name + "&" + room
  );
  eventSource.onmessage = function (event) {
    console.log(event.data);
    saveInCookie(event.data);
  };
}

var onModalHide = function () {
  document.getElementById("demo-modal").style.display = "block";
  document.getElementById("demo-modal").style.width = "0px";
  reconnect();
};

var onModalOpen = function () {
  div_btn.setAttribute("data-badge", 0);
  saveInCookie(0)
  eventSource.close();
};
