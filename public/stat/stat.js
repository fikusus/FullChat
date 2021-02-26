eventSource = new EventSource(
    "https://chat.tss2020.site/statisticstream/"
  );
  eventSource.onmessage = function (event) {
      let data = JSON.parse(event.data);
      let out =  `<h2>Человек онлайн:${data["online"]}</h2>` ;
    

      delete data.online;

        for(let i = 0; i < Object.keys(data).length;i++){
            out+= `<h2> ${Object.keys(data)[i]} : ${data[Object.keys(data)[i]]}`
        }
      document.getElementById("information").innerHTML = out;
    console.log(event);
  };