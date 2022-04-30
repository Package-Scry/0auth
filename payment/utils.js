const STRIPE_API_KEY =
  "sk_test_51KsYyOEbki2GiZiheTB6mpTMnydGHLFGx15Ut8orjMl0jhjgfhyRNJvAqLT9WMqKIZRzZ4ACNQ5IcTwv3e1KCfgr00FMgcfW1b"
const stripe = require("stripe")(STRIPE_API_KEY)

const STRIPE_MONTHLY_ID = "price_1KsZ4ZEbki2GiZihrbfz68np"
const STRIPE_YEARLY_ID = "price_1KsZ4ZEbki2GiZihRGuM1sPR"

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
      })

      return {
        idSubscription: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      }
    } catch (error) {
      throw { message: error.message, type: "STRIPE_CREATE_SUBSCRIPTION" }
    }
  },
}
