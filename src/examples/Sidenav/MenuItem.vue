<script setup>
import SidenavCollapse from "./SidenavCollapse.vue"
import { computed } from "vue"

const props = defineProps({
  menu: {
    type: Object,
    required: true,
  },
})

// Функция для иконок
const getMenuIcon = (path) => {
  const icons = {
    dashboard: "dashboard",
    individuals: "contacts",
    "legal-entity": "contacts",
    products: "article",
    roles: "rule",
    users: "people",
    subdivisions: "business",
    "menu-access": "rule",
    "product-groups": "article",
    "managers-analitycs": "analytics",
    "costs-analitycs": "analytics",
    "products-analitycs": "analytics",
    "categories-analitycs": "analytics",
    "storage-analitycs": "analytics",
    storages: "article",
    stores: "warehouse",
    "client-sources": "article",
    "payment-methods": "article",
    "order-subjects": "article",
    "outlay-statuses": "article",
    "outlay-groups": "article",
    "outlay-group-names": "article",
    "outlay-group-name": "article",
    "consumption-groups": "article",
    "expense-groups": "article",
    "partner-types": "article",
    documents: "article",
    "outlay-group-templates": "article",
    "outlay-cheque-statuses": "article",
    cashes: "account_balance_wallet",
    tasks: "task",
    "my-tasks": "assignment",
    "my-outlays": "receipt_long",
    "outlay-logs": "history",
  }
  return icons[path] || "menu"
}
const iconText = computed(() => {
  const menu = props.menu
  if (menu.title?.trim() === "Справочники") return "menu_book"
  if (menu.children && menu.children.length > 0 && menu.children[0].path) {
    return getMenuIcon(menu.children[0].path)
  }
  return getMenuIcon(menu.path)
})
</script>

<template>
  <li class="nav-item">
    <sidenav-collapse
      :url="menu.path.startsWith('#') ? '#' : `/${menu.path}`"
      :aria-controls="''"
      :collapse="menu.children && menu.children.length > 0"
      :collapseRef="menu.id.toString()"
      :navText="menu.title"
      :isExpanded="true"
    >
      <template v-slot:icon>
        <i class="material-icons-round opacity-10 fs-5" v-text="iconText"></i>
      </template>
      <template v-if="menu.children && menu.children.length > 0" v-slot:list>
        <ul class="navbar-nav">
          <menu-item
            v-for="child in menu.children"
            :key="child.id"
            :menu="child"
          />
        </ul>
      </template>
    </sidenav-collapse>
  </li>
</template>
