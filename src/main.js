import { createApp } from "vue";
import App from "./App.vue";
import Auth from './Auth.vue'
import store from "./store";
import router from "./router";
import authRouter from './router/auth'
import "./assets/css/nucleo-icons.css";
import "./assets/css/nucleo-svg.css";
import MaterialDashboard from "./material-dashboard";
import axios from "axios";
import {API, TOKEN_USER_NAME, token} from './api';

// const appInstance = createApp(App);
// appInstance.use(store);
// appInstance.use(router);
// appInstance.use(MaterialDashboard);
// appInstance.mount("#app");

const config = {
    headers: {Authorization: `Bearer ${token}`}
}

axios.get(`${API}/user`, config).then(data => {
    if (data.data.id) {
        // createApp(App)
        //     .use(router)
        //     .use(store)
        //     .mount('#app')
        const appInstance = createApp(App);
        appInstance.use(store);
        appInstance.use(router);
        appInstance.use(MaterialDashboard);
        appInstance.mount("#app");
    }else{
        runLogin();
    }
}).catch((e) => {
    runLogin();
    console.log("MESSAGE", e);
})

const runLogin = () => {
    localStorage.removeItem(TOKEN_USER_NAME);
    const appInstance = createApp(Auth);
    appInstance.use(MaterialDashboard);
    appInstance.use(authRouter)
    appInstance.use(store);
    appInstance.mount("#app");
}