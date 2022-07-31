import { MongoClient } from "mongodb"
import { MONGO_URI } from "./constants"

const client = new MongoClient(MONGO_URI)

export default client
