import { Request, Response } from "express"
import axios from "axios"
import crypto from "crypto"
import yaml from "js-yaml"
import { ObjectId } from "mongodb"

import { app } from "./app"
import client from "./client"
import { authenticate } from "./auth/authenticate"

module.exports = () => {
  app.get("/user", authenticate, (_: Request, res: Response) => {
    const user = res.locals?.user

    res.json({ status: "success", user })
  })

  app.get("/latest", async (_: Request, res: Response) => {
    try {
      const url =
        "https://package-scry.sfo3.digitaloceanspaces.com/releases/latest-mac.yml"
      const response = await axios.get(url)
      const doc = yaml.load(response.data) as { version: string }
      const macUrl = `https://package-scry.sfo3.digitaloceanspaces.com/releases/Package%20Scry-${doc.version}.dmg`

      res.json({ status: "success", url: { mac: macUrl } })
    } catch (error) {
      console.error(error)

      res.json({ status: "failed" })
    }
  })

  app.post(
    "/post/contact",
    authenticate,
    async (req: Request, res: Response) => {
      const { id } = res.locals?.user
      const { type, text } = req.body
      const database = client.db("website")
      const collectionContacts = database.collection("contacts")

      const newContact = {
        createdAt: new Date(),
        text,
        type,
        created_by: new ObjectId(id),
        updated_by: new ObjectId(id),
        idUser: new ObjectId(id),
      }

      try {
        await collectionContacts.insertOne(newContact)

        res.json({ status: "success" })
      } catch (error) {
        console.error("Mongo contact insert error:", error)

        res.json({ status: "failed" })
      }
    }
  )

  app.post("/post/subscribe", async (req: Request, res: Response) => {
    const { email } = req.body
    const database = client.db("website")
    const collectionEmail = database.collection("email")
    const unsubHash = crypto.randomBytes(60).toString("hex")

    try {
      const newEmail = {
        createdAt: new Date(),
        email,
        unsubHash,
      }

      await collectionEmail.insertOne(newEmail)

      res.json({
        status: "success",
      })
    } catch (error) {
      console.error(error)
      res.json({ status: "failed" })
    }
  })

  app.get("/unsub/:hash", async (req: Request, res: Response) => {
    const { hash } = req.params
    const database = client.db("website")
    const collectionEmail = database.collection("email")

    try {
      await collectionEmail.findOneAndDelete({ unsubHash: hash })

      res.redirect("https://packagescry.com/unsubbed")
    } catch (error) {
      console.error(error)
      res.json({ status: "failed" })
    }
  })
}
