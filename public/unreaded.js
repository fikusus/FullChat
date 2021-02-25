let base_link = "https://practical-meitner-9f815d.netlify.app/";
let button_id = document.currentScript.getAttribute("data-chat-id");
let parametrs = JSON.parse(
  document.currentScript.getAttribute("data-chat-options")
);

let out_link =
  base_link +
  "?name=" +
  parametrs.person +
  "&room=" +
  parametrs.room +
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

let unreaded = getCookie(parametrs.room_id+"unreaded-chat-message");

if (!unreaded) {
  unreaded = 0;
}

let head = window.document.getElementsByTagName("head")[0];

let aFile = "https://mixchatserver.azurewebsites.net/upload/modalChatStyle.css";
let style = window.document.createElement("link");
style.href = aFile;
style.rel = "stylesheet";
head.appendChild(style);

let button_main = document.getElementById(button_id);
button_main.innerHTML =
  " <div class='fixed-action-btn chat badgetalized' id='open-modal-chat-btn' data-badge='" +
  unreaded +
  "'><a  href='#demo-modal' class='btn-floating modal-trigger btn-large red'><i class='material-icons'>mode_comment</i></a></div>";

let div_btn = document.getElementById("open-modal-chat-btn");

$("#" + button_id).one("click", function () {});

let cliked_times = 0;
$("#" + button_id).on("click", function () {
  if (cliked_times === 0) {
    let div = document.createElement("div");
    div_btn.setAttribute("data-badge", "0");
    div.className = "chat modal";
    div.id = "demo-modal";
    div.innerHTML =
      "<div class='modal-content'>" +
      "<a  class='modal-action modal-close' id = 'close-modal-btn'><span class='material-icons'> clear</span></a>" +
      "<iframe id='chat-iframe'  src='" +
      out_link +
      "' width='468' height='700'></iframe></div>";
    document.getElementsByClassName("container")[0].append(div);
    $(".modal").modal({
      complete: onModalHide,
      ready: onModalOpen,
    });
    cliked_times++;
  } else {
    document.getElementById("demo-modal").style.width = "468px";
    div_btn.setAttribute("data-badge", "0");
    document.cookie = parametrs.room_id+"unreaded-chat-message=0";
  }
});

async function doAjax() {
  const result = await $.ajax({
    url: "https://mixchatserver.azurewebsites.net/test",
    data: { name: name, room: room },
    method: "POST",
  });
  return result;
}
let timerId;
startUnreadedHandling();

function setInCookie() {
  doAjax().then(function (result) {
    if (result !== unreaded) {
      div_btn.setAttribute("data-badge", result);
      document.cookie = parametrs.room_id+"unreaded-chat-message=" + result;
    }
  });
}
var onModalHide = function () {
  document.getElementById("demo-modal").style.display = "block";
  document.getElementById("demo-modal").style.width = "0px";
  startUnreadedHandling();
};

var onModalOpen = function () {
  clearTimeout(timerId);
};

function startUnreadedHandling() {
  timerId = setTimeout(function tick() {
    setInCookie();
    timerId = setTimeout(tick, 2000); // (*)
  }, 2000);
}
