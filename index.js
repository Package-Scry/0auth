const express = require("express");
const session = require("express-session");
const axios = require("axios");
const redis = require("redis");
const RedisStore = require("connect-redis")(session);

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

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.REDIS_SECRET,
    resave: true,
    name: 'teest',
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60000 }
  })
);

io.on("connection", (socket) => {
  const id = socket.id;

  console.log(`client ${id} connected`);

  socket.join(id);
  socket.on("disconnect", () => console.log(`client ${id} disconnected`));
});

app.get("/isLoggedIn", async (req, res) => {
  req.session.test2 = "test2";
  req.session.save(() => {
    console.log("222222SAVED SESSSION")
    console.log(req.session);
    
  });

  return res.json({ isLoggedIn: false });
});
app.get("/test", async (req, res) => {
    console.log("-----------SESSSION")
    console.log(req.session);

  return res.json({ isLoggedIn: false });
});
app.get("/saveToken/:token", async (req, res) => {
  req.session.token = req.params.token;
  req.session.save(() => {
    console.log("+++++++SAVED SESSSION")
    console.log(req.session);
  });

  return res.json({ isLoggedIn: false });
});
app.get("/auth/:idSocket", async (req, res) => {
  const { idSocket } = req.params;

  console.log("SESSION ISSSS")
  console.log(req.session)
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

    console.log(user)
    redisClient.get(id, (error, reply) => {
      if (!reply)
        redisClient.set(id, JSON.stringify(user), (error) => {
          console.log("SETTING")
          if (error) {
            console.log("redis error");
            console.error(error);
            io.to(idSocket).emit("authentication", "failure");
          } else {
            io.to(idSocket).emit("authentication", "success");
          }
        });

      console.log("SESSION")
      console.log(req.session)
      if (!req.session) req.session = {};

      req.session.token = token;
      req.session.test = "test";
      req.session.save(() => {
        console.log("SAVED SESSSION")
        console.log(req.session);
        
      });
      io.to(idSocket).emit("authentication", token);
    });

    return res.send("<script>window.close()</script>");
  } catch (error) {
    console.error(error);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log("App listening on port " + port));
