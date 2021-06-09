const { app } = require("../app");
const { createNewUser, getCurrentUser } = require("../controllers");
const { getGitHubData, getRedirectUrl } = require("../utils");
const { authenticateWithSocket } = require("./index");

const CALLBACK_PATH = `/auth/github/callback/`;

module.exports = () => {
  app.get("/auth/:idSocket", async (req, res) => {
    const { idSocket } = req.params;

    res.redirect(getRedirectUrl(idSocket));
  });

  app.get(`${CALLBACK_PATH}000000*`, async (req, res) => {
    const { idGitHub, username } = await getGitHubData(req.query.code);
    const currentUser =
      (await getCurrentUser({ idGitHub })) ??
      (await createNewUser(idGitHub, username));

    if (!req.session) req.session = {};

    if (currentUser) req.session.user = { id: currentUser._id };

    return res.redirect("https://packagescry.com");
  });

  app.get(`${CALLBACK_PATH}:idSocket`, async (req, res) => {
    const { idSocket } = req.params;

    try {
      const { idGitHub, username } = await getGitHubData(req.query.code);
      const currentUser =
        (await getCurrentUser({ idGitHub })) ??
        (await createNewUser(idGitHub, username));

      if (currentUser)
        authenticateWithSocket(idSocket, currentUser._id, currentUser.hasPro);
      const redirectHtml = `<script>window.addEventListener('DOMContentLoaded', () => {window.location.href='package-scry://'})</script><body><style type="text/css">body {background: linear-gradient(179.15deg, #0D262A 0.73%, #143F4A 22.09%, rgba(31, 125, 131, 0.873478) 50.87%, #1D787E 60.42%), #041D22;color: white;margin: 0;width: 100%;height: 100%;font-size: 3em;font-family: Bitter;box-sizing: border-box;}</style><div style="margin: 4em 0;text-align: center;">Login successful</div></body>`;

      return res.send(redirectHtml);
    } catch (error) {
      console.error(error);
    }
  });

  app.get("/site/redirect", async (req, res) => {
    res.json({ oauthUrl: getRedirectUrl("000000") });
  });

  app.get("/logout", async (req, res) => {
    req.session.destroy((error) => {
      if (error) console.warn(error);

      res.redirect("https://packagescry.com");
    });
  });
};
