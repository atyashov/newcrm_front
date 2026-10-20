<script setup>
import AppList from "@/components/AppList.vue"
import { fetchPerms } from "../services/permsService"
import { useDataList } from "./components/useDataList"
import { fetchManageMenu } from "../services/menuService"
import { updateMenuPerms } from "../services/menuPermsService"
import { onMounted, ref } from "vue"
import TableSummary from "@/components/TableSummary.vue"
import MaterialBadge from "../components/MaterialBadge.vue"
import UpdateMenuAccessModal from "../components/UpdateMenuAccessModal.vue"
import MaterialSnackbar from "../components/MaterialSnackbar.vue"

const menus = ref([])
const perms = ref([])
const errors = ref([])

const modalIsOpen = ref(false)
const changingMenuItem = ref({})

const handleCloseModal = () => {
  modalIsOpen.value = false
}

const handleModalSubmit = async (data) => {
  const menuId = data.id
  const perms = data.payload.perms ?? []
  if (menuId) {
    try {
      await updateMenuPerms(menuId, perms)
      // После успешного обновления обновляем список меню и закрываем модальное окно
      await loadMenus([], (response) => {
        if (response) {
          menus.value = response
        }
      })
      handleCloseModal()
    } catch (error) {
      console.error("Error updating menu permissions:", error)
    }
  }
}

const handleEditMenu = (menu, title) => {
  modalIsOpen.value = true
  changingMenuItem.value = menu
}

const {
  items: menuItems,
  isLoading: isMenusLoading,
  requestError: menuRequestError,
  requestSuccess: menuRequestSuccess,
  loadData: loadMenus,
} = useDataList((...args) => {
  return fetchManageMenu(...args).then((response) => {
    if (response?.errors) {
      errors.value = response.errors.map((error) => ({
        title: "Ошибка обновления",
        description: error,
        color: "danger",
        icon: { component: "error", color: "white" },
      }))
    }
    return response
  })
})
const {
  items: permItems,
  isLoading: isPermsLoading,
  requestError: permRequestError,
  requestSuccess: permRequestSuccess,
  loadData: loadPerms,
} = useDataList(fetchPerms)

onMounted(async () => {
  await loadMenus([], (response) => {
    if (response) {
      menus.value = response
    }
  })
  await loadPerms([], (response) => {
    if (response) {
      perms.value = response.data
    }
  })
})
</script>

<template>
  <header>
    <h1>Доступы к пунктам меню</h1>
  </header>
  <section>
    <TableSummary v-if="!isMenusLoading" class="mb-2" :pagination="{ total: menus.length, per_page: Math.max(1, menus.length), current_page: 1 }" />
    <div v-if="isMenusLoading" class="text-center py-4">
      <span
        class="spinner-border text-success"
        role="status"
        aria-hidden="true"
      ></span>
    </div>
    <p v-else-if="!menus.length" class="text-muted">Ничего не найдено.</p>

    <AppList v-else :items="menus" :columns="[{ key: 'title', label: 'Название' }, { key: 'perms', label: 'Разрешения' }]" :remove="false" @edit="handleEditMenu">
      <template #cell-perms="{ item }"><material-badge v-for="perm in item.perms ?? []" :key="perm.id ?? perm.title" color="success" variant="gradient" size="sm">{{ perm.title }}</material-badge></template>
    </AppList>
  </section>
  <UpdateMenuAccessModal
    :is-open="modalIsOpen"
    :isSaving="false"
    :menu="changingMenuItem"
    @close="handleCloseModal"
    @submit="handleModalSubmit"
  />
</template>
