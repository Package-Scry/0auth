const express = require("express");
const axios = require("axios");
const { MongoClient, ObjectId } = require("mongodb");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

const ID_CLIENT = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const APP_BASE_URL = "https://package-scry.herokuapp.com";
const CALLBACK_PATH = `/auth/github/callback/`;
const URI = process.env.MONGO_URI;
const CORS_ORIGIN = ["https://www.packagescry.com", "https://github.com"];
const client = new MongoClient(URI, { useUnifiedTopology: true });

app.enable("trust proxy");
app.use(bodyParser.json());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(
  session({
    secret: CLIENT_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: {
      sameSite: "none",
      maxAge: 14 * 24 * 60 * 60,
      secure: true,
    },
    store: MongoStore.create({
      mongoUrl: URI,
      ttl: 14 * 24 * 60 * 60,
      touchAfter: 24 * 60 * 60,
    }),
  })
);

(async () => {
  try {
    await client.connect();
  } catch (error) {
    console.log("DB connect error:", error);
  }
})();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.query.token;

    if (!!token) {
      const { id } = jwt.verify(token, process.env.SECRET);
      socket.idUser = id;
    }
  } catch (err) {
    console.log("IO ERROR");
    console.log(err);
  }

  next();
});

const getCurrentUser = async (query) => {
  try {
    const database = client.db("website");
    const admins = database.collection("strapi_administrator");
    const users = database.collection("users-permissions_user");
    const user = await users.findOne(query);
    const admin = await admins.findOne(query);

    return user ?? admin;
  } catch (e) {
    console.error("getCurrentUser");
    console.error(e);

    return null;
  }
};

const createNewUser = async (idGitHub, username) => {
  const database = client.db("website");
  const users = database.collection("users-permissions_user");

  const newUser = {
    idGitHub,
    createdAt: new Date(),
    hasPro: true,
    lastPaidAt: new Date(),
    // strapi fields
    username,
    password: "",
    confirmed: true,
    blocked: false,
    provider: "local",
    created_by: ObjectId("605b9add8e10cc7b4c37930a"),
    role: ObjectId("605b9a5d8e10cc7b4c379234"),
    updated_by: ObjectId("605b9add8e10cc7b4c37930a"),
  };

  try {
    const { insertedId } = await users.insertOne(newUser);

    return await getCurrentUser({ _id: insertedId });
  } catch (error) {
    console.error("Mongo user insert error:", error);
  }
};

const getRedirectUrl = (idSocket) =>
  `https://github.com/login/oauth/authorize?client_id=${ID_CLIENT}&redirect_uri=${APP_BASE_URL}${CALLBACK_PATH}${idSocket}`;

const getGitHubData = async (code) => {
  const body = {
    client_id: ID_CLIENT,
    client_secret: CLIENT_SECRET,
    code,
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
    const { id: idGitHub, login: username } = data;

    return { idGitHub, username };
  } catch (error) {
    console.error(error);
  }
};

const signJWT = (idUser) =>
  jwt.sign({ id: idUser }, process.env.SECRET, { expiresIn: "7d" });
const authenticateWithSocket = (idSocket, idUser, hasPro) => {
  const JWT = signJWT(idUser);

  io.to(idSocket).emit("authentication", { token: JWT, hasPro });
};

io.on("connection", async (socket) => {
  const id = socket.id;

  console.log(`client ${id} connected`);
  socket.join(id);

  const idUser = socket.idUser;

  if (idUser) {
    const currentUser = await getCurrentUser({ _id: ObjectId(idUser) });

    if (!currentUser) return;

    const { hasPro } = currentUser;

    authenticateWithSocket(socket.id, idUser, hasPro);
  }

  socket.on("disconnect", () => console.log(`client ${id} disconnected`));
});

app.get("/auth/:idSocket", async (req, res) => {
  const { idSocket } = req.params;

  res.redirect(getRedirectUrl(idSocket));
});

app.get(`${CALLBACK_PATH}000000*`, async (req, res) => {
  const { idGitHub, username } = await getGitHubData(req.query.code);
  const currentUser =
    (await getCurrentUser({ idGitHub })) ??
    (await createNewUser(idGitHub, username));

  if (!req.session) req.session = {};

  if (currentUser) req.session.user = { id: currentUser._id };

  return res.redirect("https://packagescry.com");
});

app.get(`${CALLBACK_PATH}:idSocket`, async (req, res) => {
  const { idSocket } = req.params;

  try {
    const { idGitHub, username } = await getGitHubData(req.query.code);
    const currentUser =
      (await getCurrentUser({ idGitHub })) ??
      (await createNewUser(idGitHub, username));

    if (currentUser)
      authenticateWithSocket(idSocket, currentUser._id, currentUser.hasPro);

    return res.send(redirectHtml);
  } catch (error) {
    console.error(error);
  }
});

app.get("/site/redirect", async (req, res) => {
  res.json({ oauthUrl: getRedirectUrl("000000") });
});

app.get("/logout", async (req, res) => {
  req.session.destroy((error) => {
    if (error) console.warn(error);

    res.redirect("https://packagescry.com");
  });
});

const authenticate = async (req, res, next) => {
  const idUser = req.session?.user?.id;

  if (!idUser) res.json({ status: "failed", user: null });
  else {
    const user = await getCurrentUser({ _id: ObjectId(idUser) });

    if (!user) {
      req.session.destroy((error) => {
        if (error) console.warn(error);

        res.json({ status: "failed", user: null });
      });
    } else {
      const { _id, username } = user;

      res.locals.user = { id: _id, username };

      next();
    }
  }
};

app.post("/post/contact", authenticate, async (req, res) => {
  const { id } = res.locals?.user;
  const { type, text } = req.body;
  const database = client.db("website");
  const users = database.collection("contacts");

  const newContact = {
    createdAt: new Date(),
    text,
    type,
    created_by: ObjectId(id),
    updated_by: ObjectId(id),
  };

  try {
    await users.insertOne(newContact);

    res.json({ status: "success" });
  } catch (error) {
    console.error("Mongo contact insert error:", error);

    res.json({ status: "failed" });
  }
});

app.get("/user", authenticate, (req, res) => {
  const user = res.locals?.user;

  res.json({ status: "success", user });
});

app.get("/subscriptions", authenticate, async (req, res) => {
  const { id, username } = res.locals?.user;
  // TODO: query subscriptions data

  res.json({
    status: "success",
    subscription: {
      id: "a2345ds4334a343s",
      type: "pro",
      timeperiod: "annual",
      price: "$58.8",
    },
  });
});

app.post("/post/subscribe", async (req, res) => {
  const { email } = req.body;
  const database = client.db("website");
  const collectionEmail = database.collection("email");
  const unsubHash = crypto.randomBytes(60).toString("hex");

  try {
    const newEmail = {
      email,
      unsubHash,
    };

    await collectionEmail.insertOne(newEmail);

    res.json({
      status: "success",
    });
  } catch (error) {
    console.error(error);
    res.json({ status: "failed" });
  }
});

app.get("/unsub/:hash", async (req, res) => {
  const { hash } = req.params;
  const database = client.db("website");
  const collectionEmail = database.collection("email");

  try {
    await collectionEmail.findOneAndDelete({ unsubHash: hash });

    res.redirect("https://packagescry.com/unsubbed");
  } catch (error) {
    console.error(error);
    res.json({ status: "failed" });
  }
});

const port = process.env.PORT || 3000;

server.listen(port, () => console.log("App listening on port " + port));

const redirectHtml = `<script>window.addEventListener('DOMContentLoaded', () => {window.location.href='package-scry://'})</script><body><style type="text/css">body {background: linear-gradient(179.15deg, #0D262A 0.73%, #143F4A 22.09%, rgba(31, 125, 131, 0.873478) 50.87%, #1D787E 60.42%), #041D22;color: white;margin: 0;width: 100%;height: 100%;font-size: 3em;font-family: Bitter;box-sizing: border-box;}</style><div style="margin: 4em 0;text-align: center;">Login successful</div></body>`;
