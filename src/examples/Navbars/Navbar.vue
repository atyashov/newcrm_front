<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue"
import { useStore } from "vuex"
import Subdivisions from "../../components/Subdivisions.vue"

defineProps(["minNav", "color"])
const store = useStore()
const isRTL = computed(() => store.state.isRTL)
const isAbsolute = computed(() => store.state.isAbsolute)
const toggleSidebar = () => store.commit("navbarMinimize")
const accountOpen = ref(false)
const accountRoot = ref(null)
const accountButton = ref(null)
const user = computed(() => store.state.user.user ?? {})
const userName = computed(() => [user.value.firstname, user.value.lastname].filter(Boolean).join(" ") || user.value.name || "Пользователь")
const userLogin = computed(() => user.value.login || user.value.email || "Не указан")
const closeOutside = (event) => {
  if (!accountRoot.value?.contains(event.target)) accountOpen.value = false
}
const handleKey = (event) => {
  if (event.key === "Escape" && accountOpen.value) {
    accountOpen.value = false
    accountButton.value?.focus()
  }
}
const logout = async () => {
  await store.dispatch("user/logoutUser")
  window.location.replace("/login")
}
onMounted(() => {
  document.addEventListener("pointerdown", closeOutside)
  document.addEventListener("keydown", handleKey)
})
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", closeOutside)
  document.removeEventListener("keydown", handleKey)
})
</script>

<template>
  <nav
    id="navbarBlur"
    class="shadow-none navbar navbar-main navbar-expand-lg border-radius-xl"
    v-bind="$attrs"
    data-scroll="true"
    :class="isAbsolute ? 'mt-4' : 'mt-0'"
  >
    <div class="px-3 py-1 container-fluid flex-nowrap">
      <Subdivisions />
      <ul class="navbar-nav flex-row align-items-center" :class="isRTL ? 'me-auto' : 'ms-auto'">
        <li ref="accountRoot" class="nav-item d-flex align-items-center position-relative">
          <button
            ref="accountButton"
            type="button"
            class="px-0 nav-link font-weight-bold lh-1 border-0 bg-transparent"
            :class="color || 'text-body'"
            aria-label="Аккаунт"
            :aria-expanded="accountOpen"
            aria-controls="account-dropdown"
            @click="accountOpen = !accountOpen"
          >
            <i class="material-icons" aria-hidden="true">account_circle</i>
          </button>
          <div v-if="accountOpen" id="account-dropdown" class="account-dropdown" aria-label="Данные пользователя">
            <strong>{{ userName }}</strong>
            <p>Логин: {{ userLogin }}</p>
            <button type="button" class="btn btn-outline-danger btn-sm mb-0 w-100" @click="logout">Выйти</button>
          </div>
        </li>
        <li class="nav-item d-xl-none ps-3 d-flex align-items-center">
          <button
            id="iconNavbarSidenav"
            type="button"
            class="p-0 nav-link text-body lh-1 border-0 bg-transparent"
            aria-label="Переключить боковое меню"
            @click="toggleSidebar"
          >
            <span class="sidenav-toggler-inner">
              <i class="sidenav-toggler-line"></i>
              <i class="sidenav-toggler-line"></i>
              <i class="sidenav-toggler-line"></i>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </nav>
</template>
