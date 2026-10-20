<template>
  <sidenav
    :custom_class="color"
    :class="[isRTL ? 'fixed-end' : 'fixed-start']"
    v-if="showSidenav"
  />
  <main
    class="main-content position-relative max-height-vh-100 h-100 overflow-x-hidden"
  >
    <navbar
      :class="[isNavFixed ? navbarFixed : '', isAbsolute ? absolute : '']"
      :color="isAbsolute ? 'text-white opacity-8' : ''"
      :minNav="navbarMinimize"
      v-if="showNavbar"
    />
    <router-view />
  </main>
  <!-- Глобальные уведомления -->
  <NotificationsHandler />
</template>
<script>
import Sidenav from "./examples/Sidenav"
import Navbar from "@/examples/Navbars/Navbar.vue"
import NotificationsHandler from "@/components/NotificationsHandler.vue"
import { mapMutations, mapState } from "vuex"

export default {
  name: "App",
  components: {
    Sidenav,
    Navbar,
    NotificationsHandler,
  },
  methods: {
    ...mapMutations(["toggleConfigurator", "navbarMinimize"]),
  },
  computed: {
    ...mapState([
      "isRTL",
      "color",
      "isAbsolute",
      "isNavFixed",
      "navbarFixed",
      "absolute",
      "showSidenav",
      "showNavbar",
      "showFooter",
      "showConfig",
      "hideConfigButton",
    ]),
  },
  beforeMount() {
    this.$store.state.isTransparent = "bg-transparent"

    const sidenav = document.getElementsByClassName("g-sidenav-show")[0]

    if (window.innerWidth > 1200) {
      sidenav.classList.add("g-sidenav-pinned")
    }
  },
}
</script>
