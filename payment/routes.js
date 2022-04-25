const axios = require("axios");
const { ObjectId } = require("mongodb");

const { app } = require("./app");
const { authenticate } = require("./auth");

module.exports = () => {
  app.post("/subscribe", authenticate, (req, res) => {
    const user = res.locals?.user;

    res.json({ status: "success", user });
  });

  app.get("/subscriptions", authenticate, async (req, res) => {
    const { id, username } = res.locals?.user;
    // TODO: query subscriptions data

    res.json({
      status: "success",
      subscription: {
        id: "a2345ds4334a343s",
        type: "pro",
        timeperiod: "annual",
        price: "$58.8",
      },
    });
  });
};
