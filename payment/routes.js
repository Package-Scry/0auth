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
      let event = req.body
      // Only verify the event if you have an endpoint secret defined.
      // Otherwise use the basic event deserialized with JSON.parse
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ""
      console.log({ endpointSecret })
      if (endpointSecret) {
        // Get the signature sent by Stripe
        const signature = req.headers["stripe-signature"]
        try {
          event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            endpointSecret
          )
        } catch (err) {
          console.log(`⚠️  Webhook signature verification failed.`, err.message)
          return res.sendStatus(400)
        }
      }

      // Handle the event
      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object
          console.log(
            `PaymentIntent for ${paymentIntent.amount} was successful!`
          )
          // Then define and call a method to handle the successful payment intent.
          // handlePaymentIntentSucceeded(paymentIntent);
          break
        case "payment_method.attached":
          const paymentMethod = event.data.object
          // Then define and call a method to handle the successful attachment of a PaymentMethod.
          // handlePaymentMethodAttached(paymentMethod);
          break
        default:
          // Unexpected event type
          console.log(`Unhandled event type ${event.type}.`)
      }

      // Return a 200 res to acknowledge receipt of the event
      res.send()
    }
  )
}
