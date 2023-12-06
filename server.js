const express = require("express");
const dotenv = require("dotenv").config();
const mongoclient = require("mongodb").MongoClient;
const bodyParser = require("body-parser");
const sha = require('sha256');

const app = express();
const url = process.env.DB_URL;
let mydb;
mongoclient
  .connect(url)
  .then((client) => {
    mydb = client.db('wise-hobby-life');
    app.listen(8080, function () {
      console.log("포트 8080으로 서버 대기 중...");
    });
  });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

app.get("/", function (req, res) {
  res.render('home.ejs');
});

app.get("/signup", function(req, res) {
  res.render('signup.ejs');
});

app.get("/login", function(req, res) {
  res.render('login.ejs');
});

app.post("/signup", function(req, res) {
  const offset = 1000 * 60 * 60 * 9
  const koreaNow = new Date((new Date()).getTime() + offset);
  console.log(req.body)

  mydb
    .collection('account')
    .insertOne({
      loginId: req.body.userid,
      password: sha(req.body.userpw),
      email: req.body.useremail,
      createdDate: koreaNow,
    })
    .then((result) => {
      res.send("<script>location.href='/';alert('성공적으로 회원가입 되었습니다!');</script>");
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
});