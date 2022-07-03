const STRIPE_API_KEY = process.env.STRIPE_TEST_KEY
const stripe = require("stripe")(STRIPE_API_KEY)

const STRIPE_MONTHLY_ID = "price_1KsZ4ZEbki2GiZihrbfz68np"
const STRIPE_YEARLY_ID = "price_1KsZ4ZEbki2GiZihRGuM1sPR"
const TRIAL_AMOUNT_DAYS = 30
const lookup = require("country-code-lookup")

const convertBillingCountryToISO = (country) =>
  lookup.byCountry(country)?.["iso2"]

module.exports = {
  checkout: async (period, res) => {
    const idPrice = period === "monthly" ? STRIPE_MONTHLY_ID : STRIPE_YEARLY_ID

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price: idPrice,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: TRIAL_AMOUNT_DAYS,
        },
        // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
        // the actual Session ID is returned in the query parameter when your customer
        // is redirected to the success page.
        success_url:
          "https://packagecry.com/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://packagecry.com/canceled",
      })

      console.log("striped")
      res.redirect(303, session.url)
    } catch (error) {
      console.log("Stripe `createCustomer` error", error)

      res.json({ status: "fAILED" })
      // throw { message: error.message, type: "STRIPE_CREATE_CUSTOMER" }
    }
  },
  createStripeCustomer: async (id, customerDetails) => {
    try {
      const { address, period, ...customerDetailsWithoutAddress } =
        customerDetails
      const { country, ...addressWithoutCountry } = address
      const countrISO = convertBillingCountryToISO(country)

      console.log("BILLING DETAILS")
      console.log({
        country: countrISO,
        ...addressWithoutCountry,
      })

      if (!countrISO)
        throw { message: "Invalid country", type: "STRIPE_CREATE_CUSTOMER" }

      const customer = await stripe.customers.create({
        metadata: {
          idUser: id.toString(),
        },
        ...customerDetailsWithoutAddress,
        address: {
          country: countrISO,
          ...addressWithoutCountry,
        },
      })

      return { customer }
    } catch (error) {
      console.log("Stripe `createCustomer` error", error)

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
        expand: ["pending_setup_intent"],
        payment_settings: { save_default_payment_method: "on_subscription" },
        trial_period_days: TRIAL_AMOUNT_DAYS,
      })

      console.log("sub")
      console.log(subscription)

      return {
        idSubscription: subscription.id,
        clientSecret: subscription.pending_setup_intent.client_secret,
      }
    } catch (error) {
      throw { message: error.message, type: "STRIPE_CREATE_SUBSCRIPTION" }
    }
  },
  createEvent: (req, res) => {
    try {
      return stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET || ""
      )
    } catch (error) {
      console.log(error)
      console.log(`⚠️  Webhook signature verification failed.`)
      console.log(
        `⚠️  Check the env file and enter the correct webhook secret.`
      )
      res.status(400).send(`Webhook Error: ${error.message}`)
    }
  },
}
