import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"

import io from "../socket"
import { getUser } from "../controllers/user"
import { authenticateWithSocket } from "./authenticate"
import { JWT_SECRET } from "./constants"

module.exports = () => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.query.token

      if (!!token && typeof token === "string") {
        // @ts-ignore
        const { id } = jwt.verify(token, JWT_SECRET)
        // @ts-ignore
        socket.idUser = id
      }
    } catch (err) {
      console.log("IO ERROR")
      console.log(err)
    }

    next()
  })

  io.on("connection", async socket => {
    const id = socket.id
    const idUser = socket.idUser
    const origin = socket.handshake.origin

    if (origin === "site") {
      const idWebUser = socket.handshake.idUser

      console.log(`Joining user ${idWebUser} to live plan update`)
      socket.join(`plan${idWebUser}`)
    } else if (idUser) {
      console.log(`client ${id} connected`)
      socket.join(id)

      const currentUser = await getUser({ _id: new ObjectId(idUser) })

      if (!currentUser) return

      const { hasPro } = currentUser

      authenticateWithSocket(id, idUser, true)
    }

    socket.on("disconnect", () => console.log(`client ${id} disconnected`))
  })
}
