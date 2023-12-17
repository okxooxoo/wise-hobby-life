const express = require("express");
const dotenv = require("dotenv").config();
const bodyParser = require("body-parser");
const multer = require("multer");
let session = require("express-session");
const sha = require("sha256");
const mongoclient = require("mongodb").MongoClient;
const ObjId = require("mongodb").ObjectId;

const app = express();
const url = process.env.DB_URL;
const secret = process.env.SECRET;

const storage = multer.diskStorage({
  destination: function (req, file, done) {
    done(null, "./public/image");
  },
  filename: function (req, file, done) {
    const now = new Date().toLocaleString("ko-KR");

    const filename = `${now}${file.originalname}`;
    done(null, filename);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const upload = multer({ storage: storage });

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
  if (req.session.user) {
    mydb
      .collection("account")
      .findOne({ _id: new ObjId(req.session.user._id) })
      .then((result) => {
        const promises = result.friends.map((friendId, index) => {
          return mydb
            .collection("hobby")
            .find({ userId: new ObjId(friendId) })
            .toArray();
        });

        // Promise.all을 사용하여 모든 비동기 작업이 완료된 후에 응답을 보냄
        Promise.all(promises)
          .then((dataArray) => {
            const allData = dataArray.flat(); // 배열 평탄화
            res.render("home.ejs", { user: req.session.user, data: allData });
          })
          .catch((err) => {
            console.error(err);
            res.status(500).send();
          });
      });
  } else {
    res.render("home.ejs", { user: req.session.user });
  }
});


app.get("/signup", function (req, res) {
  res.render("signup.ejs", { user: req.session.user });
});

app.get("/login", function (req, res) {
  res.render("login.ejs", { user: req.session.user });
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
      friends: [],
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
    .findOne({ loginId: req.body.userid })
    .then((result) => {
      if (result.password === sha(req.body.userpw)) {
        req.session.user = result;
        res.redirect("/");
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

app.get("/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/");
});

app.get("/share", function (req, res) {
  if (req.session.user) {
    res.render("share.ejs", { user: req.session.user });
  } else {
    res.send(
      "<script>location.href='/login';alert('로그인 후에 이용할 수 있습니다.');</script>"
    );
  }
});

app.post("/share", upload.single("image"), function (req, res) {
  const now = new Date().toLocaleString("ko-KR");
  const imagePath = req.file.path.replace("public/", "");

  mydb
    .collection("hobby")
    .insertOne({
      userId: new ObjId(req.session.user._id),
      title: req.body.title,
      content: req.body.content,
      image: imagePath,
      createdDate: now,
    })
    .then((result) => {
      res.send(
        "<script>location.href='/explore';alert('성공적으로 취미를 공유하였습니다!');</script>"
      );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
});

app.get("/explore", function (req, res) {
  mydb
    .collection("hobby")
    .find()
    .toArray()
    .then((result) => {
      res.render("explore.ejs", { user: req.session.user, data: result });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
});

app.get("/detail/:id", function (req, res) {
  req.params.id = new ObjId(req.params.id);

  mydb
    .collection("hobby")
    .findOne({ _id: req.params.id })
    .then((data) => {
      // 작성자 정보를 DB에서 가져오기
      const writer_id = new ObjId(data.userId);
      mydb
        .collection("account")
        .findOne({ _id: writer_id })
        .then((writer) => {
          res.render("detail.ejs", {
            data: data,
            writer: writer,
            user: req.session.user,
          });
        });
    })
    .catch((err) => {
      res.status(500).send();
    });
});

app.get("/blog/:userId", function (req, res) {
  req.params.userId = new ObjId(req.params.userId); // 블로그 유저의 고유 ID

  mydb
    .collection("hobby")
    .find({ userId: req.params.userId })
    .toArray()
    .then((hobbyData) => {
      mydb
        .collection("account")
        .findOne({ _id: req.params.userId })
        .then((blogUser) => {
          res.render("blog.ejs", {
            data: hobbyData,
            blogUser: blogUser,
            user: req.session.user,
          });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
});

app.post("/delete", function (req, res) {
  req.body._id = new ObjId(req.body._id);

  mydb
    .collection("hobby")
    .deleteOne(req.body)
    .then((result) => {
      res.status(200).send();
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
});

app.get("/edit/:id", function (req, res) {
  req.params.id = new ObjId(req.params.id);

  mydb
    .collection("hobby")
    .findOne({ _id: req.params.id })
    .then((data) => {
      res.render("edit.ejs", {
        data: data,
        user: req.session.user,
      });
    })
    .catch((err) => {
      res.status(500).send();
    });
});

app.post("/edit", upload.single("image"), function (req, res) {
  const newId = new ObjId(req.body.id);
  console.log(req.body);

  const updateData = {
    title: req.body.title,
    content: req.body.content,
  };

  if (req.file) {
    const imagePath = req.file.path.replace("public/", "");
    updateData.image = imagePath;
  }

  mydb
    .collection("hobby")
    .updateOne(
      { _id: newId },
      { $set: updateData })
    .then((result) => {
      res.send(
        "<script>location.href='/explore';alert('수정 완료!');</script>"
      );
    })
    .catch((err) => {
      res.status(500).send();
    });
});

app.post('/follow', function (req, res) {

  mydb
    .collection("account")
    .findOne({ _id: new ObjId(req.session.user._id) })
    .then((result) => {
      let newFriends = [];

      if (result.friends) {
        if (result.friends.includes(req.body._id)) {
          newFriends = result.friends.filter((value, index) => {
            return value != req.body._id;
          });
        } else {
          newFriends = [...result.friends, req.body._id];
        }
      } else {
        newFriends = [req.body._id];
      }

      const updateData = {
        friends: newFriends,
      };

      mydb
        .collection("account")
        .updateOne(
          { _id: new ObjId(req.session.user._id) },
          { $set: updateData })
        .then((result) => {
          res.status(200).send();
        })
        .catch((err) => {
          res.status(500).send();
        });
    })
    .catch((err) => {
      console.log(err);
    });
});