const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

app.listen(8080, function () {
  console.log("포트 8080으로 서버 대기 중...");
});

app.get("/", function (req, res) {
  res.render('home.ejs');
});

app.get("/signup", function(req, res) {
  res.render('signup.ejs');
});

app.get("/login", function(req, res) {
  res.render('login.ejs');
});