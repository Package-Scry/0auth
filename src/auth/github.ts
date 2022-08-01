import axios from "axios"
import {
  ID_CLIENT,
  APP_BASE_URL,
  CALLBACK_PATH,
  CLIENT_SECRET,
} from "./constants"

type CommonError = {
  message: string
}

export const getRedirectUrl = (idSocket: string) =>
  `https://github.com/login/oauth/authorize?client_id=${ID_CLIENT}&redirect_uri=${APP_BASE_URL}${CALLBACK_PATH}${idSocket}`

export const getGitHubData = async (code: string) => {
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
  } catch (e) {
    const error = e as CommonError
    console.log("GitHub `login` error", error)

    throw { message: error.message, type: "GITHUB_LOGIN_ERROR" }
  }
}
