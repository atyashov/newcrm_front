import { createApp } from "vue"
import App from "./App.vue"
import Auth from "./Auth.vue"
import store from "./store"
import router from "./router"
import authRouter from "./router/auth"
import "./assets/css/nucleo-icons.css"
import "./assets/css/nucleo-svg.css"
import "bootstrap-icons/font/bootstrap-icons.css"
import MaterialDashboard from "./material-dashboard"
import axios from "axios"
import { API, TOKEN_USER_NAME, token } from "./api"
import FileManager from "laravel-file-manager"

const config = {
  headers: { Authorization: `Bearer ${token}` },
}

const mountApp = async () => {
  await store.dispatch("subdivisions/initSubdivisions")

  const appInstance = createApp(App)
  appInstance.use(store)
  appInstance.use(router)
  appInstance.use(MaterialDashboard)
  appInstance.use(FileManager, { store })
  appInstance.mount("#app")
}

const runLogin = () => {
  localStorage.removeItem(TOKEN_USER_NAME)
  const appInstance = createApp(Auth)
  appInstance.use(MaterialDashboard)
  appInstance.use(authRouter)
  appInstance.use(store)
  appInstance.mount("#app")
}

axios
  .get(`${API}/user`, config)
  .then(async (data) => {
    if (data.data.id) {
      await mountApp()
    } else {
      runLogin()
    }
  })
  .catch((e) => {
    runLogin();
    console.log("MESSAGE", e)
  })
