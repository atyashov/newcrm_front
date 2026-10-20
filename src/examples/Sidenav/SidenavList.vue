<script setup>
import { defineProps, computed, onMounted, ref, provide } from "vue"
import { useStore } from "vuex"
import MenuItem from "./MenuItem.vue"

defineProps({
  cardBg: String,
})

const store = useStore()
const isDarkMode = computed(() => store.state.isDarkMode)
const isRTL = computed(() => store.state.isRTL)

// Получаем меню из состояния

const treeMenus = computed(() => store.getters["menu/treeMenus"])

const expandedMenus = ref({}) // Shared состояние для всех пунктов -->
provide("expandedMenus", expandedMenus) // Provide для дочерних компонентов -->

// Загружаем меню при монтировании компонента
onMounted(() => {
  store.dispatch("menu/loadMenus")
})
</script>

<template>
  <div
    class="w-auto h-auto collapse navbar-collapse max-height-vh-100 h-100"
    id="sidenav-collapse-main"
  >
    <ul class="navbar-nav">
      <menu-item v-for="menu in treeMenus" :key="menu.id" :menu="menu" />
      <li class="nav-item">
        <button
          type="button"
          class="nav-link theme-toggle border-0 bg-transparent"
          :aria-label="isDarkMode ? 'Включить светлую тему' : 'Включить тёмную тему'"
          :title="isDarkMode ? 'Включить светлую тему' : 'Включить тёмную тему'"
          :aria-pressed="isDarkMode"
          @click="store.dispatch('toggleTheme')"
        >
          <div class="text-center d-flex align-items-center justify-content-center" :class="isRTL ? 'ms-2' : 'me-2'">
            <i class="material-icons-round opacity-10 fs-5" aria-hidden="true">{{ isDarkMode ? "light_mode" : "dark_mode" }}</i>
          </div>
          <span class="nav-link-text" :class="isRTL ? 'me-1' : 'ms-1'">{{ isDarkMode ? "Светлая тема" : "Тёмная тема" }}</span>
        </button>
      </li>
      <!-- <li class="nav-item">
        <sidenav-collapse
          url="#"
          :aria-controls="''"
          v-bind:collapse="false"
          collapseRef="tables"
          navText="Tables"
        >
          <template v-slot:icon>
            <i class="material-icons-round opacity-10 fs-5">table_view</i>
          </template>
        </sidenav-collapse>
      </li>
      <li class="nav-item">
        <sidenav-collapse
          url="#"
          :aria-controls="''"
          v-bind:collapse="false"
          collapseRef="billing"
          navText="Billing"
        >
          <template v-slot:icon>
            <i class="material-icons-round opacity-10 fs-5">receipt_long</i>
          </template>
        </sidenav-collapse>
      </li>
      <li class="nav-item">
        <sidenav-collapse
          url="#"
          :aria-controls="''"
          v-bind:collapse="false"
          collapseRef="rtl-page"
          navText="Rtl"
        >
          <template v-slot:icon>
            <i class="material-icons-round opacity-10 fs-5"
              >format_textdirection_r_to_l</i
            >
          </template>
        </sidenav-collapse>
      </li>
      <li class="nav-item">
        <sidenav-collapse
          url="#"
          :aria-controls="''"
          v-bind:collapse="false"
          collapseRef="notifications"
          navText="Notifications"
        >
          <template v-slot:icon>
            <i class="material-icons-round opacity-10 fs-5">notifications</i>
          </template>
        </sidenav-collapse>
      </li> -->
      <!-- <li class="mt-3 nav-item">
        <h6
          class="text-xs ps-4 text-uppercase font-weight-bolder text-white"
          :class="$store.state.isRTL ? 'me-4' : 'ms-2'"
        >
          Аккаунт
        </h6>
      </li> -->
    </ul>
    <div class="sidenav-footer position-absolute w-100 bottom-0">
      <!-- <div class="mx-3">
        <a
          class="btn mt-4 w-100"
          :class="`bg-gradient-${this.$store.state.color}`"
          href="https://www.creative-tim.com/product/vue-material-dashboard-2-pro"
          >Upgrade to pro</a
        >
      </div> -->
    </div>
  </div>
</template>

<style scoped>
.theme-toggle { width: calc(100% - 2rem); text-align: start; }
</style>
