const { MongoClient } = require("mongodb");

const URI = process.env.MONGO_URI

const client = new MongoClient(URI, { useUnifiedTopology: true });

module.exports = client;
