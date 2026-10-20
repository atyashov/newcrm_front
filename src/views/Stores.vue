<script setup>
import AppList from "@/components/AppList.vue"
import { onMounted, ref } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import CreateStoreModal from "@/components/CreateStoreModal.vue"
import Filter from "@/views/components/Filter.vue"
import { buildQueryParams } from "@/views/components/buildQueryParams"
import { useDataList } from "@/views/components/useDataList"
import { useFiltering } from "@/views/components/useFiltering"
import { useModal } from "@/views/components/useModal"
import { usePagination } from "@/views/components/usePagination"
import { useSorting } from "@/views/components/useSorting"
import { fetchStores, createStore, updateStore, deleteStore } from "@/services/storesService"

const { toggleSort, getSortIcon, getSortParam } = useSorting()
const { updateFilters, getFilterParams } = useFiltering()
const { pageSize, paginationMeta, currentPage, updatePaginationMeta, canGoToPage, changePageSize, resetToFirstPage } = usePagination(20)
const { items, isLoading, requestError, loadData, showError, clearMessages } = useDataList(fetchStores)
const { isOpen, editingId, editingData, open, close } = useModal()
const isSaving = ref(false)
const saveError = ref("")
const inputOptions = [{ name: "title", placeholder: "Название", type: "text" }]
const getList = (page = currentPage.value) => loadData(buildQueryParams({ page, perPage: pageSize.value, filters: getFilterParams(), sort: getSortParam() }),
  (result) => updatePaginationMeta(result.pagination, page, pageSize.value))
const filter = (values) => { updateFilters(values); resetToFirstPage(); getList(1) }
const sort = () => { toggleSort("title"); resetToFirstPage(); getList(1) }
const changePage = (page) => { if (canGoToPage(page, isLoading.value)) getList(page) }
const changeSize = (size) => { if (changePageSize(size)) getList(1) }
const openForm = (item = null) => { saveError.value = ""; clearMessages(); open(item?.id ?? null, item) }
const submit = async ({ id, payload }) => {
  if (isSaving.value) return
  isSaving.value = true
  saveError.value = ""
  try {
    const result = id ? await updateStore(id, payload) : await createStore(payload)
    if (result?.status !== true) throw new Error(result?.message || "Не удалось сохранить склад.")
    close()
    await getList()
  } catch (err) {
    saveError.value = Object.values(err.response?.data?.errors ?? {}).flat().join(" ") || err.response?.data?.message || err.message
  } finally { isSaving.value = false }
}
const remove = async (item) => {
  if (isLoading.value || !confirm(`Удалить склад «${item.title}»?`)) return
  isLoading.value = true
  clearMessages()
  try {
    const result = await deleteStore(item.id)
    if (result?.status !== true) throw new Error(result?.message || "Не удалось удалить склад.")
    await getList(items.value.length === 1 && currentPage.value > 1 ? currentPage.value - 1 : currentPage.value)
  } catch (err) { showError(err.response?.data?.message || err.message) }
  finally { isLoading.value = false }
}
onMounted(() => getList(1))
const listColumns = [
  { key: "title", label: "Название", sortable: true },
]
</script>

<template>
  <section class="stores-page">
    <header class="stores-header">
      <div><h1>Склады</h1><p class="text-muted mb-0">Управление складами товаров</p></div>
      <MaterialButton color="success" @click="openForm()">Создать склад</MaterialButton>
    </header>
    <Filter :input-options="inputOptions" @change="filter" />
    <div v-if="requestError" class="alert alert-danger" role="alert">{{ requestError }}</div>
    <div v-if="isLoading" class="text-center py-4"><span class="spinner-border text-success" role="status"></span></div>
    <div v-else>
      <TableSummary class="mb-2" :pagination="paginationMeta" />
      <AppList v-if="items.length" :items="items" :columns="listColumns" :get-sort-icon="getSortIcon"
        @sort="sort" @edit="openForm" @delete="remove" />
      <p v-else class="text-muted">Склады не найдены.</p>
      <MaterialPagination class="mt-3" :pagination="paginationMeta" :page-size-options="[20, 50, 100]" @change="changePage" @pageSizeChange="changeSize" />
    </div>
    <CreateStoreModal :is-open="isOpen" :store-id="editingId" :initial-data="editingData" :is-saving="isSaving" :error="saveError" @close="close" @submit="submit" />
  </section>
</template>

<style scoped lang="scss">
.stores-page { padding: 1.5rem; }
.stores-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.stores-header h1 { font-size: 1.75rem; margin: 0; }
@media(max-width: 575.98px) { .stores-header { align-items: flex-start; flex-direction: column; } }
</style>
