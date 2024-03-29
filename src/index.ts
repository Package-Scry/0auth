import { server } from "./app"
import client from "./client"

const main = async () => {
  try {
    await client.connect()
    console.log("Mongo connected")

    const initAuthRoutes = require("./auth/routes")
    const initPaymentRoutes = require("./payment/routes")
    const initRoutes = require("./routes")
    const initSocket = require("./auth/socket")

    initAuthRoutes()
    initPaymentRoutes()
    initRoutes()
    initSocket()

    const port = process.env.PORT || 3000

    server.listen(port, () => console.log("App listening on port " + port))
  } catch (error) {
    console.log("DB connect error:", error)
  }
}

main()
