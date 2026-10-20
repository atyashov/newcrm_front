import axios from "axios"
// import { deleteCookie, getCookie, setCookie } from '@utils/cookies.js';
import { API, TOKEN_USER_NAME, headers } from "../../api.js"

const API_GET_USER_URL = API + "/user"

const state = {
  user: {},
}
const getters = {
  user: (state) => (data) => {
    console.log(data)
    return state.user
  },
}
const actions = {
  async getUser({ commit }) {
    // const token = getCookie(COOKIE_USER_NAME);
    const token = localStorage.getItem(TOKEN_USER_NAME)
    const config = {
      headers: { Authorization: `Bearer ${token}` },
    }
    await axios
      .get(API_GET_USER_URL, config)
      .then((res) => res.data)
      .then((data) => {
        console.log(data)
        commit("setUser", data)
      })
  },
  logoutUser({ commit }) {
    localStorage.removeItem(TOKEN_USER_NAME)
    delete headers.Authorization
    commit("setUser", {})
    return true
  },
}
const mutations = {
  setUser(state, userData) {
    state.user = userData
  },
}

export default {
  namespaced: true,
  state,
  actions,
  getters,
  mutations,
}
