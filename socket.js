const { server } = require("./app");
const io = require("socket.io")(server);

module.exports = io;
