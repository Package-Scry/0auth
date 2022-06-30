const { app } = require("../app")
const { authenticate } = require("../auth")
const {
  createStripeCustomer,
  createStripeSubscription,
  createEvent,
} = require("./utils")
const express = require("express")

module.exports = () => {
  app.post("/post/create-subscription", authenticate, async (req, res) => {
    const { id } = res.locals?.user
    const { billingDetails } = req.body
    const BILLING_FIELDS = ["email", "name", "address", "period"]
    const ADDRESS_FIELDS = ["city", "line1", "country"]

    console.log("details")
    console.log(billingDetails)

    if (
      !billingDetails ||
      BILLING_FIELDS.some((field) => !billingDetails[field]) ||
      ADDRESS_FIELDS.some((field) => !billingDetails.address[field])
    )
      return res.json({ status: "failed", message: "Missing fields" })

    try {
      const { period, ...customerDetails } = billingDetails
      const { customer } = await createStripeCustomer(id, customerDetails)

      console.log("customer")
      console.log(customer)

      const { idSubscription, clientSecret } = await createStripeSubscription(
        customer.id,
        period
      )

      console.log("sub")
      console.log(idSubscription, clientSecret)

      res.json({
        status: "success",
        subscription: { clientSecret, id: idSubscription },
      })
    } catch (error) {
      console.log("Stripe `error.type` error", error)
      res.json({ status: "failed", message: "Payment failed." })
    }
  })

  app.post(
    "/post/stripe-webhook",
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
            // save hasPro to db
            // const subscription_id = dataObject.subscription
            // const payment_intent_id = dataObject.payment_intent

            // Retrieve the payment intent used to pay the subscription
            // const payment_intent = await stripe.paymentIntents.retrieve(
            //   payment_intent_id
            // )

            // const subscription = await stripe.subscriptions.update(
            //   subscription_id,
            //   {
            //     default_payment_method: payment_intent.payment_method,
            //   }
            // )
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
      res.send()
    }
  )
}
