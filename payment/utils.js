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
}
