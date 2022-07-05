const { ObjectId } = require("mongodb")
const jwt = require("jsonwebtoken")

const io = require("../socket")
const { getCurrentUser } = require("../controllers")

const signJWT = (idUser) =>
  jwt.sign({ id: idUser }, process.env.SECRET, { expiresIn: "7d" })

module.exports = {
  authenticate: async (req, res, next) => {
    const idUser = req.session?.user?.id

    if (!idUser) res.json({ status: "failed", user: null })
    else {
      const user = await getCurrentUser({ _id: ObjectId(idUser) })

      if (!user) {
        req.session.destroy((error) => {
          if (error) console.warn(error)

          res.json({ status: "failed", user: null })
        })
      } else {
        const { _id, username } = user

        res.locals.user = { id: _id, username }

        next()
      }
    }
  },
  authenticateWithSocket: (idSocket, idUser, hasPro) => {
    const JWT = signJWT(idUser)

    io.to(idSocket).emit("authentication", { token: JWT, hasPro })
  },
}
