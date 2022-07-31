const STRIPE_API_KEY = process.env.STRIPE_TEST_KEY ?? ""
import Stripe from "stripe"
import { Request, Response } from "express"
import { ObjectId } from "mongodb"
import {
  STRIPE_MONTHLY_ID,
  STRIPE_YEARLY_ID,
  TRIAL_AMOUNT_DAYS,
} from "./constants"

const stripe = new Stripe(STRIPE_API_KEY, {
  apiVersion: "2020-08-27",
})

enum PlanPeriods {
  Monthly = "monthly",
  Yearly = "yearly",
}

type CommonError = {
  message: string
}

export const checkout = async (idUser: string, period: PlanPeriods) => {
  const idPrice =
    period === PlanPeriods.Monthly ? STRIPE_MONTHLY_ID : STRIPE_YEARLY_ID

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      metadata: {
        idUser: idUser.toString(),
      },
      line_items: [
        {
          price: idPrice,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_AMOUNT_DAYS,
        metadata: {
          idUser: idUser.toString(),
        },
      },
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // the actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: "https://packagescry.com/payment-success",
      cancel_url: "https://packagescry.com/canceled",
    })

    return session.url
  } catch (e) {
    const error = e as CommonError
    console.log("Stripe `createCustomer` error", error)

    throw { message: error.message, type: "STRIPE_CREATE_CHECKOUT" }
  }
}

export const getPortalLink = async (idUser: typeof ObjectId) => {
  const subscription = await stripe.subscriptions.search({
    query: `metadata['idUser']:'${idUser}'`,
  })

  const { customer, id: idSubscription } = subscription?.data?.[0]
  const idCustomer = typeof customer === "string" ? customer : customer.id

  if (!idSubscription)
    throw { message: "No subscription", type: "STRIPE_GET_PORTAL_LINK" }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: idCustomer,
  })

  return portalSession.url
}

export const getStripeSubscription = async (idSubscription: ObjectId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      idSubscription.toString()
    )

    console.log("sub")
    console.log(subscription)

    return {
      idSubscription: subscription.id,
      period:
        subscription.items.data[0].price.id === STRIPE_YEARLY_ID
          ? "annual"
          : "monthly",
      status: subscription.status,
    }
  } catch (e) {
    const error = e as CommonError
    throw { message: error.message, type: "STRIPE_GET_SUBSCRIPTION" }
  }
}

export const createEvent = (req: Request, res: Response) => {
  try {
    return stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"] ?? "",
      process.env.STRIPE_WEBHOOK_SECRET || ""
    )
  } catch (e) {
    const error = e as CommonError

    console.log(error)
    console.log(`⚠️  Webhook signature verification failed.`)
    console.log(`⚠️  Check the env file and enter the correct webhook secret.`)
    res.status(400).send(`Webhook Error: ${error.message}`)
  }
}
