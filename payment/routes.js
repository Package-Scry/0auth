const { app } = require("../app")
const { authenticate } = require("../auth")
const {
  createStripeCustomer,
  createStripeSubscription,
  createEvent,
} = require("./utils")
const express = require("express")

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

  app.post(
    "/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      console.log("STRIPE WEBHOOK")
      const event = createEvent(req)

      // Extract the object from the event.
      const dataObject = event?.data?.object

      switch (event.type) {
        case "invoice.payment_succeeded":
          if (dataObject.billing_reason === "subscription_create") {
            console.log("PAYMENT SUCCEEDED")
            console.log(JSON.stringify(dataObject, null, 2))
            return
            // save hasPro to db
            const subscription_id = dataObject.subscription
            const payment_intent_id = dataObject.payment_intent

            // Retrieve the payment intent used to pay the subscription
            const payment_intent = await stripe.paymentIntents.retrieve(
              payment_intent_id
            )

            const subscription = await stripe.subscriptions.update(
              subscription_id,
              {
                default_payment_method: payment_intent.payment_method,
              }
            )
          }
          break
        case "invoice.paid":
          // save to db
          console.log("INVOICE PAID")
          console.log(JSON.stringify(dataObject, null, 2))
          break
        case "invoice.payment_failed":
          // warn
          console.log("PAYMENT FAILED")
          console.log(JSON.stringify(dataObject, null, 2))
          break
        case "customer.subscription.deleted":
          console.log("SUB DELETED")
          console.log(JSON.stringify(dataObject, null, 2))
          if (event.request != null) {
            // remove from db -- unsubbed
          } else {
            // remove from db -- unsubbed automatically
          }
          break
        default:
        // Unexpected event type
      }
      res.json({ received: true })
    }
  )
}
