let base_link="https://fikusus.github.io/Client_Mix_Chat_V2/",button_id=document.currentScript.getAttribute("data-chat-id"),parametrs=JSON.parse(document.currentScript.getAttribute("data-chat-options")),out_link=base_link+"?name="+parametrs.person+"&room="+parametrs.room.replace("'","`").replace('"',"`")+"&room_id="+parametrs.room_id+"&secret="+parametrs.room_key;console.log(out_link);var name=parametrs.person,room=parametrs.room_id;function getCookie(e){let t=document.cookie.match(new RegExp("(?:^|; )"+e.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g,"\\$1")+"=([^;]*)"));return t?decodeURIComponent(t[1]):void 0}let unreaded=getCookie("unreaded-chat-message");unreaded||(unreaded=0);let head=window.document.getElementsByTagName("head")[0],aFile="https://mix-chat.azurewebsites.net/scripts/modalStyle.css",style=window.document.createElement("link");style.href=aFile,style.rel="stylesheet",head.appendChild(style);let button_main=document.getElementById(button_id);button_main.innerHTML=" <div class='fixed-action-btn chat badgetalized' id='open-modal-chat-btn' data-badge='"+unreaded+"'><a  href='#demo-modal' class='btn-floating modal-trigger btn-large red'><i class='material-icons'>mode_comment</i></a></div>";let div_btn=document.getElementById("open-modal-chat-btn");$("#"+button_id).one("click",function(){});let cliked_times=0;function saveInCookie(e){e!==unreaded&&(div_btn.setAttribute("data-badge",e),document.cookie="unreaded-chat-message="+e)}function reconnect(){eventSource=new EventSource("https://mix-chat.azurewebsites.net/stream/"+name+"&"+room),eventSource.onmessage=function(e){saveInCookie(e.data)}}$("#"+button_id).on("click",function(){if(0===cliked_times){let e=document.createElement("div");div_btn.setAttribute("data-badge","0"),e.className="chat modal",e.id="demo-modal",e.innerHTML="<div class='modal-content'><p class='modal-action modal-close' id = 'close-modal-btn'><span class='material-icons'> clear</span></p><iframe id='chat-iframe'  src='"+out_link+"'  frameborder='0'></iframe></div>",document.getElementsByClassName("container")[0].append(e),$(".modal").modal({complete:onModalHide,ready:onModalOpen}),cliked_times++}else document.getElementById("demo-modal").style.width="468px"}),reconnect();var onModalHide=function(){document.getElementById("demo-modal").style.display="block",document.getElementById("demo-modal").style.width="0px",reconnect()},onModalOpen=function(){eventSource.close()};