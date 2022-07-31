import { Request, Response, NextFunction } from "express"
import { ObjectId } from "mongodb"
import jwt from "jsonwebtoken"
import io from "../socket"
import { getUser } from "../controllers/user"
import { JWT_SECRET } from "./constants"

const signJWT = (idUser: string) =>
  jwt.sign({ id: idUser }, JWT_SECRET, { expiresIn: "7d" })

export const authenticate = async (
  req: Request & { session: { user: { id: string } } },
  res: Response,
  next: NextFunction
) => {
  const idUser = req.session?.user?.id

  if (!idUser) res.json({ status: "failed", user: null })
  else {
    const user = await getUser({ _id: new ObjectId(idUser) })

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
}

export const authenticateWithSocket = (
  idSocket: string,
  idUser: ObjectId,
  hasPro: boolean
) => {
  const JWT = signJWT(idUser.toString())

  io.to(idSocket).emit("authentication", { token: JWT, hasPro })
}
