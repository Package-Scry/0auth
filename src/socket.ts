import { Server } from "socket.io"
import { server } from "./app"

const io = new Server(server, {
  cors: {
    origin: "https://www.packagescry.com",
    methods: ["GET", "POST"],
  },
})

export default io
