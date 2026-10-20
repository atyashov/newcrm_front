<script setup>
import { useStore } from "vuex"
import DirectoryList from "@/components/DirectoryList.vue"
import CreateSubdivisionModal from "@/components/CreateSubdivisionModal.vue"
import { fetchSubdivisionList, createSubdivision, updateSubdivision, deleteSubdivision } from "@/services/subdivisionsService"
const store = useStore()
const columns = [
  { key: "id", label: "ID", sortable: true },
  { key: "title", label: "Название", sortable: true },
  { key: "amo_ids", label: "ID связанных воронок из AMO", sortable: true },
  { key: "sms_sender_name", label: "Имя отправителя SMS", sortable: true },
  { key: "site_link", label: "Сайт", sortable: true },
]
const filters = columns.filter((column) => column.key !== "id").map((column) => ({ name: column.key, placeholder: column.label, type: "text" }))
const refreshHeader = async () => {
  const available = await store.dispatch("subdivisions/loadSubdivisions")
  if (!available.some((item) => String(item.id) === String(store.getters["subdivisions/subdivision"]))) {
    await store.dispatch("subdivisions/setSubdivision", null)
  }
}
</script>
<template>
  <DirectoryList title="Подразделения" create-label="Создать подразделение" :columns="columns" :filters="filters" :fetch-items="fetchSubdivisionList" :create-item="createSubdivision" :update-item="updateSubdivision" :delete-item="deleteSubdivision" :form-component="CreateSubdivisionModal" @changed="refreshHeader" />
</template>
