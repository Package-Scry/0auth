const axios = require("axios")
const APP_BASE_URL = "https://package-scry.onrender.com/"
const ID_CLIENT = process.env.CLIENT_ID
const CALLBACK_PATH = `/auth/github/callback/`
const CLIENT_SECRET = process.env.CLIENT_SECRET

module.exports = {
  getRedirectUrl: (idSocket) =>
    `https://github.com/login/oauth/authorize?client_id=${ID_CLIENT}&redirect_uri=${APP_BASE_URL}${CALLBACK_PATH}${idSocket}`,
  getGitHubData: async (code) => {
    const body = {
      client_id: ID_CLIENT,
      client_secret: CLIENT_SECRET,
      code,
    }
    const options = { headers: { accept: "application/json" } }

    try {
      const response = await axios.post(
        `https://github.com/login/oauth/access_token`,
        body,
        options
      )
      const token = response.data.access_token
      const { data } = await axios({
        method: "get",
        url: `https://api.github.com/user`,
        headers: {
          Authorization: "token " + token,
        },
      })
      const { id: idGitHub, login: username } = data

      return { idGitHub, username }
    } catch (error) {
      console.error(error)
    }
  },
}
