import express from "express"
import cors from "cors"
import http from "http"
import session from "express-session"
import MongoStore from "connect-mongo"

const URI = process.env.MONGO_URI
const CLIENT_SECRET = process.env.CLIENT_SECRET
const CORS_ORIGIN = [
  "https://www.packagescry.com",
  "https://github.com",
  "https://checkout.stripe.com",
]

const app = express()

const server = http.createServer(app)

app.enable("trust proxy")
app.use((req, res, next) => {
  if (req.originalUrl === "/post/stripe-webhook") {
    next()
  } else {
    express.json()(req, res, next)
  }
})
app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(
  session({
    secret: CLIENT_SECRET ?? "",
    saveUninitialized: false,
    resave: false,
    cookie: {
      sameSite: "none",
      maxAge: 14 * 24 * 60 * 60 * 1000,
      secure: true,
    },
    store: MongoStore.create({
      mongoUrl: URI,
      ttl: 14 * 24 * 60 * 60,
      touchAfter: 24 * 60 * 60,
    }),
  })
)

export default { app, server }
