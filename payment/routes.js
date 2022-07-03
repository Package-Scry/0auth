const { app } = require("../app")
const { authenticate } = require("../auth")
const {
  createStripeCustomer,
  createStripeSubscription,
  createEvent,
} = require("./utils")
const express = require("express")
const STRIPE_API_KEY = process.env.STRIPE_TEST_KEY
const stripe = require("stripe")(STRIPE_API_KEY)
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
      const sig = req.headers["stripe-signature"]

      let event

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET || ""
        )
      } catch (err) {
        // On error, log and return the error message
        console.log(`❌ Error message: ${err.message}`)
        return res.status(400).send(`Webhook Error: ${err.message}`)
      }

      // Successfully constructed event
      console.log("✅ Success:", event.id)

      // Return a response to acknowledge receipt of the event
      res.json({ received: true })
    }
  )
}
