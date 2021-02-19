const express = require("express");
const app = express();
const axios = require("axios");
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const callbackPath = `/auth/github/callback/`;

io.on("connection", (socket) => {
  const id = socket.id;

  console.log(`client ${id} connected`);

  socket.join(id);
  socket.on("disconnect", () => console.log(`client ${id} disconnected @${socket.idUser}`));
});

app.get("/isLoggedIn", async (req, res) => {
  const isLoggedIn = !!req.user?.id

  return res.json({ isLoggedIn })
})
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

    io.to(idSocket).emit("authentication", "success");

    return res.send("<script>window.close()</script>");
  } catch (error) {
    console.error(error);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log("App listening on port " + port));
