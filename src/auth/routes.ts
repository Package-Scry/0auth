import { Request, Response } from "express"
import { app } from "../app"
import { createUser, getUser } from "../controllers/user"
import { getGitHubData, getRedirectUrl } from "./github"
import { authenticateWithSocket } from "./authenticate"
import { CALLBACK_PATH } from "./constants"

module.exports = () => {
  app.get("/auth/:idSocket", async (req: Request, res: Response) => {
    const { idSocket } = req.params

    res.redirect(getRedirectUrl(idSocket))
  })

  // TODO: refactor return
  const webLogin = async (req: Request) => {
    try {
      const { idGitHub, username } = await getGitHubData(
        req.query.code as string
      )
      const currentUser =
        (await getUser({ idGitHub })) ?? (await createUser(idGitHub, username))

      // @ts-ignore
      if (!req.session) req.session = {}

      if (currentUser) req.session.user = { id: currentUser._id }

      return ""
    } catch (e) {
      return "/login"
    }
  }

  app.get(`${CALLBACK_PATH}000000*`, async (req: Request, res: Response) => {
    const redirectUrl = await webLogin(req)

    return res.redirect(`https://packagescry.com${redirectUrl}`)
  })

  app.get(`${CALLBACK_PATH}:idSocket`, async (req: Request, res: Response) => {
    const { idSocket } = req.params

    try {
      const { idGitHub, username } = await getGitHubData(
        req.query.code as string
      )
      const currentUser =
        (await getUser({ idGitHub })) ?? (await createUser(idGitHub, username))

      if (currentUser) authenticateWithSocket(idSocket, currentUser._id, true)
      const redirectHtml = `<script>window.addEventListener('DOMContentLoaded', () => {window.location.href='package-scry://'})</script><body><style type="text/css">body {background: linear-gradient(179.15deg, #0D262A 0.73%, #143F4A 22.09%, rgba(31, 125, 131, 0.873478) 50.87%, #1D787E 60.42%), #041D22;color: white;margin: 0;width: 100%;height: 100%;font-size: 3em;font-family: Bitter;box-sizing: border-box;}</style><div style="margin: 4em 0;text-align: center;">Login successful</div></body>`

      return res.send(redirectHtml)
    } catch (error) {
      console.error(error)
    }
  })

  app.get("/site/redirect", async (_: Request, res: Response) => {
    res.json({ oauthUrl: getRedirectUrl("000000") })
  })

  app.get("/logout", async (req, res) => {
    req.session.destroy(error => {
      if (error) console.warn(error)

      res.redirect("https://packagescry.com")
    })
  })
}
