const express = require("express");
const dotenv = require("dotenv").config();
const bodyParser = require("body-parser");
let session = require("express-session");
const sha = require("sha256");
const mongoclient = require("mongodb").MongoClient;
const ObjId = require("mongodb").ObjectId;

const app = express();
const url = process.env.DB_URL;
const secret = process.env.SECRET;

let mydb;

mongoclient.connect(url).then((client) => {
  mydb = client.db("wise-hobby-life");
  app.listen(8080, function () {
    console.log("포트 8080으로 서버 대기 중...");
  });
});

app.use(
  session({
    secret: secret,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

app.get("/", function (req, res) {
  res.render("home.ejs", {user: req.session.user});
});

app.get("/signup", function (req, res) {
  res.render("signup.ejs");
});

app.get("/login", function (req, res) {
  res.render("login.ejs");
});

app.post("/signup", function (req, res) {
  const offset = 1000 * 60 * 60 * 9;
  const koreaNow = new Date(new Date().getTime() + offset);
  console.log(req.body);

  mydb
    .collection("account")
    .insertOne({
      loginId: req.body.userid,
      password: sha(req.body.userpw),
      name: req.body.username,
      email: req.body.useremail,
      createdDate: koreaNow,
    })
    .then((result) => {
      res.send(
        "<script>location.href='/';alert('성공적으로 회원가입 되었습니다!');</script>"
      );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
});

app.post("/login", function (req, res) {
  mydb
    .collection("account")
    .findOne({loginId: req.body.userid})
    .then((result) => {
      if (result.password === sha(req.body.userpw)) {
        req.session.user = result;
        res.redirect('/');
      } else {
        res.send(
          "<script>location.href='/login';alert('아이디 혹은 비밀번호가 일치하지 않습니다.');</script>"
        );
      }
    })
    .catch((err) => {
      res.send(
        "<script>location.href='/login';alert('아이디 혹은 비밀번호가 일치하지 않습니다.');</script>"
      );
    });
});

app.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

app.get('/share', function(req, res) {
  res.render("share.ejs");
});