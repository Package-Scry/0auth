const express = require("express");
const axios = require("axios");
const redis = require("redis");
const jwt = require('jsonwebtoken');

const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASS,
});

const callbackPath = `/auth/github/callback/`;

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.query.token;

    console.log("token")
    console.log(token)
    console.log(typeof token)
    console.log((!!token))
    if (!!token) {
      console.log("here")
      const { id } = jwt.verify(token, "shhhhh");
      socket.idUser = id;
      console.log("USER ID", id)
      next();
    }

  } catch (err) {
    console.log("IO ERROR")
    console.log(err)
  }
});

io.on("connection", (socket) => {
  const id = socket.id;

  console.log(`client ${id} connected`);

  socket.join(id);
  socket.on("disconnect", () => console.log(`client ${id} disconnected`));
});

app.get("/keys", async (req, res) => {
  redisClient.keys("*", async (err, keys) => {
    if (err) return console.log(err);
    if (keys) {
      await Promise.all(
        keys.map((key) => {
          redisClient.get(key, (error, value) => {
            console.log(key, value);
          });
        })
      );
    }
  });

  return res.json({ isLoggedIn: false });
});

app.get("/flush", async (req, res) => {
  redisClient.flushdb(function (err, succeeded) {
    return res.json({ flushed: succeeded });
  });

  return res.json({ flushed: false });
});


app.get("/auth/:idSocket", async (req, res) => {
  const { idSocket } = req.params;

  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=https://package-scry.herokuapp.com${callbackPath}${idSocket}`
  );
});

app.get(`${callbackPath}:idSocket`, async (req, res) => {
  const { idSocket } = req.params;
  const body = {
    client_id: clientId,
    client_secret: clientSecret,
    code: req.query.code,
  };
  const options = { headers: { accept: "application/json" } };

  try {
    const response = await axios.post(
      `https://github.com/login/oauth/access_token`,
      body,
      options
    );
    const token = response.data.access_token;
    const { data } = await axios({
      method: "get",
      url: `https://api.github.com/user`,
      headers: {
        Authorization: "token " + token,
      },
    });

    const { id, login: name, email } = data;
    const user = {
      id,
      name,
      email,
    };

    redisClient.get(id, (error, reply) => {
      if (!reply)
        redisClient.set(id, JSON.stringify(user), (error) => {
          console.log("SETTING");
          if (error) {
            console.log("redis error");
            console.error(error);
            io.to(idSocket).emit("authentication", "failure");
          } else {
            io.to(idSocket).emit("authentication", "success");
          }
        });

      const JWT = jwt.sign({ id, createdAt: new Date() }, 'shhhhh');

      io.to(idSocket).emit("authentication", JWT);
    });

    return res.send("<script>window.close()</script>");
  } catch (error) {
    console.error(error);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log("App listening on port " + port));
