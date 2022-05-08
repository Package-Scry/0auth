const STRIPE_API_KEY = process.env.STRIPE_TEST_KEY
const stripe = require("stripe")(STRIPE_API_KEY)

const STRIPE_MONTHLY_ID = "price_1KsZ4ZEbki2GiZihrbfz68np"
const STRIPE_YEARLY_ID = "price_1KsZ4ZEbki2GiZihRGuM1sPR"
const TRIAL_AMOUNT_DAYS = 30

module.exports = {
  createStripeCustomer: async (id) => {
    try {
      const customer = await stripe.customers.create({
        metadata: {
          idUser: id,
        },
      })

      return { customer }
    } catch (error) {
      console.log("Stripe `createCustomer` error", e)

      throw { message: error.message, type: "STRIPE_CREATE_CUSTOMER" }
    }
  },
  createStripeSubscription: async (idCustomer, period) => {
    const idPrice = period === "monthly" ? STRIPE_MONTHLY_ID : STRIPE_YEARLY_ID

    try {
      const subscription = await stripe.subscriptions.create({
        customer: idCustomer,
        items: [
          {
            price: idPrice,
          },
        ],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
        trial_period_days: TRIAL_AMOUNT_DAYS,
      })

      return {
        idSubscription: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      }
    } catch (error) {
      throw { message: error.message, type: "STRIPE_CREATE_SUBSCRIPTION" }
    }
  },
  createEvent: async (req) => {
    try {
      return stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET || ""
      )
    } catch (err) {
      console.log(err)
      console.log(`⚠️  Webhook signature verification failed.`)
      console.log(
        `⚠️  Check the env file and enter the correct webhook secret.`
      )
    }
  },
}
