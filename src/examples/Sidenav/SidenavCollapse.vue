<script setup>
import { inject, computed } from "vue"
import { useStore } from "vuex"
import { useRoute } from "vue-router"

const props = defineProps({
  url: {
    type: String,
    default: "#",
  },
  collapseRef: {
    type: String,
    required: true,
  },
  navText: {
    type: String,
    required: true,
  },
  collapse: {
    type: Boolean,
    default: true,
  },
})

const $store = useStore()
const $route = useRoute()

const expandedMenus = inject("expandedMenus")

const isExpanded = computed(
  () => expandedMenus.value[props.collapseRef] || false,
)

const isRTL = computed(() => $store.state.isRTL)
const color = computed(() => $store.state.color)

const handleToggle = () => {
  if (!props.collapse) return // Только для collapsible пунктов
  const current = expandedMenus.value[props.collapseRef] || false
  // Сворачиваем все другие
  Object.keys(expandedMenus.value).forEach((key) => {
    if (key !== props.collapseRef) expandedMenus.value[key] = false
  })
  // Переключаем текущий
  expandedMenus.value[props.collapseRef] = !current
}

const getRoute = () => {
  const routeArr = $route.path.split("/")
  return routeArr[1]
}
</script>
<template>
  <router-link
    :data-bs-toggle="collapse ? 'collapse' : ''"
    :to="url"
    :aria-controls="collapseRef"
    :aria-expanded="isExpanded"
    class="nav-link"
    :class="
      getRoute() === (url.startsWith('/') ? url.split('/')[1] : url)
        ? `active bg-gradient-${color}`
        : ''
    "
    v-bind="$attrs"
    @click="handleToggle"
  >
    <div
      class="text-center d-flex align-items-center justify-content-center"
      :class="isRTL ? ' ms-2' : 'me-2'"
    >
      <slot name="icon"></slot>
    </div>
    <span class="nav-link-text" :class="isRTL ? ' me-1' : 'ms-1'">{{
      navText
    }}</span>
  </router-link>
  <div :class="isExpanded ? 'collapse show' : 'collapse'">
    <slot name="list"></slot>
  </div>
</template>
