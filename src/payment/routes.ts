import express, { Request, Response } from "express"
import { app } from "../app"
import { authenticate } from "../auth/authenticate"
import { PlanPeriods, STRIPE_YEARLY_ID } from "./constants"
import { checkout, createEvent, getPortalLink } from "./stripe"
import { updateUser } from "../controllers/user"

module.exports = () => {
  app.get("/subscriptions", authenticate, async (_: Request, res: Response) => {
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

  app.post(
    "/post/checkout",
    authenticate,
    async (req: Request, res: Response) => {
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
    }
  )

  app.post(
    "/post/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      console.log("STRIPE WEBHOOK")
      const event = createEvent(req, res)

      // Extract the object from the event.
      const dataObject = event?.data?.object

      switch (event?.type) {
        case "invoice.payment_succeeded":
          // @ts-ignore https://github.com/stripe/stripe-node/issues/1387
          if (dataObject?.billing_reason === "subscription_create") {
            // @ts-ignore
            const { idUser } = dataObject.lines.data[0].metadata
            const period =
              // @ts-ignore
              dataObject.lines.data[0].price.id === STRIPE_YEARLY_ID
                ? PlanPeriods.Yearly
                : PlanPeriods.Monthly

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
          // @ts-ignore
          const { idUser } = dataObject.metadata
          if (event.request != null)
            await updateUser({ id: idUser, hasPro: false, period: null })
          else {
            // remove from db -- unsubbed automatically
            await updateUser({ id: idUser, hasPro: false, period: null })
          }
          break
        default:
        // Unexpected event type
      }

      res.send()
    }
  )
}
