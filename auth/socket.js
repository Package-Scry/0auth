const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

const io = require("../socket");
const { getCurrentUser } = require("../controllers");
const { authenticateWithSocket } = require("./index");

module.exports = () => {
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
};
