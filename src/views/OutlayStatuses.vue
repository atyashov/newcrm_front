<script setup>
import AppList from "@/components/AppList.vue"
import { computed, ref, watch } from "vue"
import { useStore } from "vuex"
import CreateOutlayStatusModal from "@/components/CreateOutlayStatusModal.vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import {
  createOutlayStatus,
  deleteOutlayStatus,
  fetchOutlayStatuses,
  updateOutlayStatus,
} from "@/services/outlayStatusesService"
import Filter from "@/views/components/Filter.vue"
import { buildQueryParams } from "@/views/components/buildQueryParams"
import { useDataList } from "@/views/components/useDataList"
import { useFiltering } from "@/views/components/useFiltering"
import { useModal } from "@/views/components/useModal"
import { usePagination } from "@/views/components/usePagination"
import { useSorting } from "@/views/components/useSorting"

const store = useStore()
const subdivisionId = computed(() => store.getters["subdivisions/subdivision"] ?? null)
const isSaving = ref(false)
const deletingId = ref(null)
const formError = ref("")
const { toggleSort, getSortIcon, getSortParam } = useSorting()
const { updateFilters, getFilterParams } = useFiltering()
const { pageSize, paginationMeta, currentPage, updatePaginationMeta, canGoToPage, changePageSize, resetToFirstPage } = usePagination(20)
const { items: statuses, isLoading, requestError, requestSuccess, loadData, showSuccess, showError, clearMessages } = useDataList(fetchOutlayStatuses)
const { isOpen, editingId, editingData, open, close } = useModal()
const inputOptions = [
  { name: "title", placeholder: "Название", type: "text" },
  { name: "sort_order", placeholder: "Порядок", type: "text" },
  { name: "affects_stock", placeholder: "Влияние на склад", type: "select", options: [
    { value: "1", label: "Влияет" },
    { value: "0", label: "Не влияет" },
  ] },
]

const getList = async (page = 1) => {
  if (!subdivisionId.value) return
  await loadData(buildQueryParams({
    page,
    perPage: pageSize.value,
    filters: { ...getFilterParams(), subdivision_id: subdivisionId.value },
    sort: getSortParam(),
  }), (result) => updatePaginationMeta(result.pagination, page, pageSize.value))
}
const openForm = (status = null) => {
  formError.value = ""
  clearMessages()
  open(status?.id ?? null, status)
}
const save = async (form) => {
  if (isSaving.value || !subdivisionId.value) return
  try {
    isSaving.value = true
    formError.value = ""
    const isEdit = Boolean(editingId.value)
    const payload = { ...form, subdivision_id: Number(subdivisionId.value) }
    const response = isEdit
      ? await updateOutlayStatus(editingId.value, payload)
      : await createOutlayStatus(payload)
    if (response?.status !== true) throw new Error(response?.message || "Не удалось сохранить статус.")
    close()
    await getList(currentPage.value)
    showSuccess(isEdit ? "Статус обновлён." : "Статус создан.")
  } catch (error) {
    console.error("Ошибка сохранения статуса сметы", error)
    formError.value = error?.response?.data?.message ?? error.message ?? "Не удалось сохранить статус."
  } finally {
    isSaving.value = false
  }
}
const remove = async (status) => {
  if (deletingId.value || !confirm(`Удалить статус «${status.title}»?`)) return
  try {
    deletingId.value = status.id
    clearMessages()
    const response = await deleteOutlayStatus(status.id)
    if (response?.status !== true) throw new Error(response?.message || "Не удалось удалить статус.")
    const page = statuses.value.length === 1 ? Math.max(1, currentPage.value - 1) : currentPage.value
    await getList(page)
    showSuccess(`Статус «${status.title}» удалён.`)
  } catch (error) {
    console.error("Ошибка удаления статуса сметы", error)
    showError(error?.response?.data?.message ?? error.message ?? "Не удалось удалить статус.")
  } finally {
    deletingId.value = null
  }
}
const filterChanged = (values) => {
  updateFilters(values)
  resetToFirstPage()
  getList()
}
const sort = (field) => {
  toggleSort(field)
  resetToFirstPage()
  getList()
}
const goToPage = (page) => {
  if (canGoToPage(page, isLoading.value)) getList(page)
}
const resize = (size) => {
  if (changePageSize(size)) getList()
}

watch(subdivisionId, () => {
  close()
  resetToFirstPage()
  getList()
}, { immediate: true })
const listColumns = [
  { key: "title", label: "Название", sortable: true },
  { key: "sort_order", label: "Порядок", sortable: true },
  { key: "affects_stock", label: "Влияет на склад", sortable: true, format: (item) => item.affects_stock ? "Да" : "Нет" },
]
</script>

<template>
  <section class="outlay-statuses-page">
    <header class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div><h1 class="mb-0">Статусы смет</h1><p class="text-muted mb-0">Управление статусами и складским учётом</p></div>
      <MaterialButton color="success" :disabled="!subdivisionId || isSaving" @click="openForm()">Создать статус</MaterialButton>
    </header>
    <p v-if="!subdivisionId" class="text-muted">Выберите подразделение в шапке.</p>
    <template v-else>
      <Filter :input-options="inputOptions" @change="filterChanged" />
      <p v-if="requestError" class="alert alert-danger">{{ requestError }}</p>
      <p v-if="requestSuccess" class="alert alert-success">{{ requestSuccess }}</p>
      <div v-if="isLoading" class="text-center py-4"><span class="spinner-border text-success"></span></div>
      <template v-else>
        <TableSummary class="mb-2" :pagination="paginationMeta" />
        <p v-if="!statuses.length" class="text-muted">Статусы не найдены.</p>
        <AppList v-else :items="statuses" :columns="listColumns" :get-sort-icon="getSortIcon"
        :delete-disabled="deletingId !== null" @sort="sort" @edit="openForm" @delete="remove" />
        <MaterialPagination class="mt-3" :pagination="paginationMeta" :page-size-options="[20, 50, 100]" @change="goToPage" @pageSizeChange="resize" />
      </template>
    </template>
    <CreateOutlayStatusModal :is-open="isOpen" :status-id="editingId" :initial-data="editingData" :is-saving="isSaving" :error="formError" @close="close" @submit="save" />
  </section>
</template>

<style scoped lang="scss">
.outlay-statuses-page { padding: 1.5rem; }
.outlay-statuses-page h1 { font-size: 1.75rem; font-weight: 600; }
</style>
