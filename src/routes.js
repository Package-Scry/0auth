const axios = require("axios");
const crypto = require("crypto");
const yaml = require("js-yaml");
const { ObjectId } = require("mongodb");

const { app } = require("./app");
const client = require("./client");
const { authenticate } = require("./auth");

module.exports = () => {
  app.get("/user", authenticate, (req, res) => {
    const user = res.locals?.user;

    res.json({ status: "success", user });
  });

  app.get("/latest", async (req, res) => {
    try {
      const url =
        "https://package-scry.sfo3.digitaloceanspaces.com/releases/latest-mac.yml";
      const response = await axios.get(url);
      const doc = yaml.load(response.data);
      const macUrl = `https://package-scry.sfo3.digitaloceanspaces.com/releases/Package%20Scry-${doc.version}.dmg`;

      res.json({ status: "success", url: { mac: macUrl } });
    } catch (error) {
      console.error(error);

      res.json({ status: "failed" });
    }
  });

  app.post("/post/contact", authenticate, async (req, res) => {
    const { id } = res.locals?.user;
    const { type, text } = req.body;
    const database = client.db("website");
    const collectionContacts = database.collection("contacts");

    const newContact = {
      createdAt: new Date(),
      text,
      type,
      created_by: ObjectId(id),
      updated_by: ObjectId(id),
      idUser: ObjectId(id),
    };

    try {
      await collectionContacts.insertOne(newContact);

      res.json({ status: "success" });
    } catch (error) {
      console.error("Mongo contact insert error:", error);

      res.json({ status: "failed" });
    }
  });

  app.post("/post/subscribe", async (req, res) => {
    const { email } = req.body;
    const database = client.db("website");
    const collectionEmail = database.collection("email");
    const unsubHash = crypto.randomBytes(60).toString("hex");

    try {
      const newEmail = {
        createdAt: new Date(),
        email,
        unsubHash,
      };

      await collectionEmail.insertOne(newEmail);

      res.json({
        status: "success",
      });
    } catch (error) {
      console.error(error);
      res.json({ status: "failed" });
    }
  });

  app.get("/unsub/:hash", async (req, res) => {
    const { hash } = req.params;
    const database = client.db("website");
    const collectionEmail = database.collection("email");

    try {
      await collectionEmail.findOneAndDelete({ unsubHash: hash });

      res.redirect("https://packagescry.com/unsubbed");
    } catch (error) {
      console.error(error);
      res.json({ status: "failed" });
    }
  });
};
