const express = require("express");
const axios = require("axios");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server);

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const callbackPath = `/auth/github/callback/`;
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { useUnifiedTopology: true });

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
  const database = client.db("website");
  const admins = database.collection("strapi_administrator");
  const users = database.collection("users-permissions_user");
  const user = await users.findOne(query);
  const admin = await admins.findOne(query);

  return user ?? admin;
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
    return await users.insertOne(newUser);
  } catch (error) {
    console.error("Mongo user insert error:", error);
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
    const { hasPro } = currentUser

    authenticateWithSocket(socket.id, idUser, hasPro)
  }

  socket.on("disconnect", () => console.log(`client ${id} disconnected`));
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
  const isFromApp = idSocket !== "000000";

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
    const currentUser =
      (await getCurrentUser({ idGitHub })) ??
      (await createNewUser(idGitHub, username));

    if (isFromApp) {
      authenticateWithSocket(idSocket, currentUser._id, currentUser.hasPro);
      return res.send(redirectHtml);
    } else {
      const JWT = signJWT(idUser);

      res.set("x-token", JWT);
      res.redirect("https://packagescry.com/success");
    }
  } catch (error) {
    console.error(error);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log("App listening on port " + port));

const redirectHtml = `<script>window.addEventListener('DOMContentLoaded', () => {window.location.href='package-scry://'})</script><body><style type="text/css">body {background: linear-gradient(179.15deg, #0D262A 0.73%, #143F4A 22.09%, rgba(31, 125, 131, 0.873478) 50.87%, #1D787E 60.42%), #041D22;color: white;margin: 0;width: 100%;height: 100%;font-size: 3em;font-family: Bitter;box-sizing: border-box;}</style><div style="margin: 4em 0;text-align: center;">Login successful</div></body>`