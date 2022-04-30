const { app } = require("../app")
const { authenticate } = require("../auth")
const { createStripeCustomer, createStripeSubscription } = require("./utils")

module.exports = () => {
  app.post("/create-subscription", authenticate, async (req, res) => {
    const { id, idPrice } = res.locals?.user

    try {
      const { customer } = await createStripeCustomer(id)
      const { idSubscription, clientSecret } = await createStripeSubscription(
        customer.id,
        idPrice
      )

      res.json({
        status: "success",
        subscription: { clientSecret, id: idSubscription },
      })
    } catch (error) {
      console.log("Stripe `error.type` error", e)
      res.json({ status: "failed", message: "Payment failed." })
    }
  })
}
