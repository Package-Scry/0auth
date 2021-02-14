const express = require("express");
const app = express();
const axios = require("axios");
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const callbackPath = `/auth/github/callback/`;

app.get("/auth/:port", async (req, res) => {
  const { port } = req.params

  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=http://localhost:3000${callbackPath}${port}`
  );
}
);

app.get(`${callbackPath}:port`, async (req, res) => {
  const { port } = req.params
  const body = {
    client_id: clientId,
    client_secret: clientSecret,
    code: req.query.code,
  };
  const options = { headers: { accept: "application/json" } };

  try {
    const response = await axios.post(
      `https://github.com/login/oauth/access_token`,
      body,
      options
    );
    const token = response.data.access_token
    const { data } = await axios({
      method: 'get',
      url: `https://api.github.com/user`,
      headers: {
        Authorization: 'token ' + token
      }
    })

    // TODO: add some check here
    res.redirect(`localhost:${port}/login/success`)
  } catch (error) {
    console.error(error);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("App listening on port " + port));
