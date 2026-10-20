import { createStore } from "vuex"
import user from "./modules/user.js"
import menu from "./modules/menu.js"
import subdivisions from "./modules/subdivisions.js"

export default createStore({
  state: {
    hideConfigButton: false,
    isPinned: true,
    showConfig: false,
    sidebarType: "bg-gradient-dark",
    isRTL: false,
    color: "success",
    isNavFixed: false,
    isAbsolute: false,
    showNavs: true,
    showSidenav: true,
    showNavbar: true,
    showFooter: true,
    showMain: true,
    isDarkMode: false,
    navbarFixed:
      "position-sticky blur shadow-blur left-auto top-1 z-index-sticky px-0 mx-4",
    absolute: "position-absolute px-4 mx-0 w-100 z-index-2",
  },
  mutations: {
    setDarkMode(state, value) {
      state.isDarkMode = Boolean(value)
      document.body.classList.toggle("dark-version", state.isDarkMode)
      const secure = window.location.protocol === "https:" ? "; Secure" : ""
      document.cookie = `crm_theme=${state.isDarkMode ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
    },
    toggleConfigurator(state) {
      state.showConfig = !state.showConfig
    },
    navbarMinimize(state) {
      const sidenav_show = document.querySelector(".g-sidenav-show")

      if (sidenav_show.classList.contains("g-sidenav-pinned")) {
        sidenav_show.classList.remove("g-sidenav-pinned")
        state.isPinned = true
      } else {
        sidenav_show.classList.add("g-sidenav-pinned")
        state.isPinned = false
      }
    },
    navbarFixed(state) {
      if (state.isNavFixed === false) {
        state.isNavFixed = true
      } else {
        state.isNavFixed = false
      }
    },
    toggleEveryDisplay(state) {
      state.showNavbar = !state.showNavbar
      state.showSidenav = !state.showSidenav
      state.showFooter = !state.showFooter
    },
    toggleHideConfig(state) {
      state.hideConfigButton = !state.hideConfigButton
    },
    color(state, payload) {
      state.color = payload
    },
  },
  actions: {
    initTheme({ commit }) {
      const theme = document.cookie.split(";").map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("crm_theme="))?.split("=")[1]
      commit("setDarkMode", theme === "dark")
    },
    toggleTheme({ state, commit }) {
      commit("setDarkMode", !state.isDarkMode)
    },
    setColor({ commit }, payload) {
      commit("color", payload)
    },
  },
  getters: {},
  modules: {
    user,
    menu,
    subdivisions,
  },
})
