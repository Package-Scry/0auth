const { server } = require("./app")
const io = require("socket.io")(server, {
  cors: {
    origin: "https://www.packagescry.com",
    methods: ["GET", "POST"],
  },
})

module.exports = io
