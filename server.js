const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static(__dirname + "/public"));

app.listen(8080, function () {
  console.log("포트 8080으로 서버 대기 중...");
});

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/views/home.html");
});
