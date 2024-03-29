import { ObjectId } from "mongodb"
import client from "../client"
import { PlanPeriods } from "../payment/constants"

type User = {
  _id: ObjectId
  idGitHub: string
  createdAt: Date
  hasPro: boolean
  lastPaidAt: Date
  username: string
  password: string
  confirmed: boolean
  blocked: boolean
  created_by: ObjectId
  role: ObjectId
  updated_by: ObjectId
  period: PlanPeriods
}

type UserQuery =
  | {
      _id: ObjectId
      idGitHub?: never
    }
  | {
      _id?: never
      idGitHub: string
    }

export const getUser = async (query: UserQuery) => {
  try {
    const database = client.db("website")
    const admins = database.collection("strapi_administrator")
    const users = database.collection("users-permissions_user")
    const user = await users.findOne<User>(query)
    const admin = await admins.findOne<User>(query)

    return user ?? admin
  } catch (e) {
    console.error("getUser")
    console.error(e)

    return null
  }
}

export const createUser = async (idGitHub: string, username: string) => {
  const database = client.db("website")
  const users = database.collection("users-permissions_user")

  const newUser = {
    idGitHub,
    createdAt: new Date(),
    hasPro: true,
    lastPaidAt: new Date(),
    // strapi fields
    username,
    password: "",
    confirmed: true,
    blocked: false,
    provider: "local",
    created_by: new ObjectId("605b9add8e10cc7b4c37930a"),
    role: new ObjectId("605b9a5d8e10cc7b4c379234"),
    updated_by: new ObjectId("605b9add8e10cc7b4c37930a"),
  }

  try {
    const { insertedId } = await users.insertOne(newUser)

    return await getUser({ _id: insertedId })
  } catch (error) {
    console.error("Mongo user insert error:", error)
  }
}

export const updateUser = async (user: {
  id: ObjectId
  hasPro: boolean
  period: null | PlanPeriods
}) => {
  const { id, ...userWithoutId } = user
  const database = client.db("website")
  const users = database.collection("users-permissions_user")

  console.log("updating user", id)
  console.log("updating user", userWithoutId)

  try {
    await users.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...userWithoutId } }
    )
  } catch (error) {
    console.error("Mongo user update error:", error)
  }
}

export const isAdmin = async (id: string) => {
  try {
    const database = client.db("website")
    const admins = database.collection("strapi_administrator")
    const admin = await admins.findOne({ _id: new ObjectId(id) })

    return !!admin
  } catch (e) {
    console.error("isAdmin")
    console.error(e)

    return false
  }
}
