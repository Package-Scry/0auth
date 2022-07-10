const { app } = require("../app")
const { authenticate } = require("../auth")
const {
  STRIPE_YEARLY_ID,
  checkout,
  createEvent,
  getPortalLink,
} = require("./utils")
const express = require("express")
const { updateUser } = require("../controllers")

module.exports = () => {
  app.get("/subscriptions", authenticate, async (req, res) => {
    const { id } = res.locals?.user

    console.log("portal")

    try {
      const portalUrl = await getPortalLink(id)

      res.json({
        status: "success",
        portalUrl,
      })
    } catch (error) {
      console.log("Stripe `error.type` error", error)
      res.json({ status: "failed", message: "Getting portal link failed." })
    }
  })

  app.post("/post/checkout", authenticate, async (req, res) => {
    const { id } = res.locals?.user
    const { period } = req.body

    console.log("buy")

    try {
      const checkoutURL = await checkout(id, period)

      res.json({
        status: "success",
        checkoutURL,
      })
    } catch (error) {
      console.log("Stripe `error.type` error", error)
      res.json({ status: "failed", message: "Checkout failed." })
    }
  })

  app.post(
    "/post/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      console.log("STRIPE WEBHOOK")
      const event = createEvent(req, res)

      // Extract the object from the event.
      const dataObject = event?.data?.object

      switch (event?.type) {
        case "invoice.payment_succeeded":
          if (dataObject.billing_reason === "subscription_create") {
            console.log("PAYMENT SUCCEEDED")
            // console.log(JSON.stringify(dataObject, null, 2))

            const { idUser } = dataObject.lines.data[0].metadata
            const period =
              dataObject.lines.data[0].price.id === STRIPE_YEARLY_ID
                ? "annual"
                : "monthly"

            await updateUser({ id: idUser, hasPro: true, period })
          }
          break
        case "invoice.paid":
          // save to db
          console.log("INVOICE PAID")
          // console.log(JSON.stringify(dataObject, null, 2))
          break
        case "invoice.payment_failed":
          // warn
          console.log("PAYMENT FAILED")
          // console.log(JSON.stringify(dataObject, null, 2))
          break
        case "customer.subscription.deleted":
          console.log("SUB DELETED")
          // console.log(JSON.stringify(dataObject, null, 2))
          if (event.request != null) {
            // remove from db -- unsubbed
          } else {
            // remove from db -- unsubbed automatically
          }
          break
        default:
        // Unexpected event type
      }
      res.send()
    }
  )
}
