<script setup>
import AppList from "./AppList.vue"
import { onMounted, ref } from "vue"
import MaterialButton from "./MaterialButton.vue"
import MaterialPagination from "./MaterialPagination.vue"
import TableSummary from "./TableSummary.vue"
import Filter from "@/views/components/Filter.vue"
import { useDataList } from "@/views/components/useDataList"
import { usePagination } from "@/views/components/usePagination"
import { useSorting } from "@/views/components/useSorting"
import { useFiltering } from "@/views/components/useFiltering"
import { buildQueryParams } from "@/views/components/buildQueryParams"

const props = defineProps({ title: String, createLabel: String, columns: Array, filters: Array,
  fetchItems: Function, createItem: Function, updateItem: Function, deleteItem: Function, formComponent: Object })
const emit = defineEmits(["changed"])
const { items, isLoading, requestError, loadData, showError } = useDataList(props.fetchItems)
const { pageSize, paginationMeta, currentPage, updatePaginationMeta, changePageSize, canGoToPage } = usePagination(20)
const { toggleSort, getSortIcon, getSortParam } = useSorting()
const { updateFilters, getFilterParams } = useFiltering()
const opened = ref(false)
const selected = ref(null)
const saving = ref(false)
const saveError = ref("")
const serverErrors = ref({})
const load = (page = currentPage.value) => loadData(buildQueryParams({ page, perPage: pageSize.value,
  filters: getFilterParams(), sort: getSortParam() }), result => updatePaginationMeta(result.pagination, page))
const sort = (field) => { toggleSort(field); load(1) }
const filter = (values) => { updateFilters(values); load(1) }
const resize = (size) => { if (changePageSize(size)) load(1) }
const go = (page) => { if (canGoToPage(page, isLoading.value)) load(page) }
const open = (item = null) => { selected.value = item; saveError.value = ""; serverErrors.value = {}; opened.value = true }
const close = () => { if (!saving.value) opened.value = false }
const submit = async (payload) => {
  if (saving.value) return
  saving.value = true
  saveError.value = ""
  serverErrors.value = {}
  try {
    const result = selected.value ? await props.updateItem(selected.value.id, payload) : await props.createItem(payload)
    if (result?.status !== true) {
      serverErrors.value = result?.errors ?? {}
      throw new Error(Object.values(serverErrors.value).flat().join(" ") || result?.message || "Не удалось сохранить запись.")
    }
    opened.value = false
    await load()
    emit("changed")
  } catch (error) {
    serverErrors.value = error.response?.data?.errors ?? serverErrors.value
    saveError.value = Object.values(serverErrors.value).flat().join(" ") || error.response?.data?.message || error.message
  } finally { saving.value = false }
}
const remove = async (item) => {
  if (isLoading.value || !confirm("Удалить выбранную запись?")) return
  isLoading.value = true
  try {
    const result = await props.deleteItem(item.id)
    if (result?.status !== true) throw new Error(result?.message || "Не удалось удалить запись.")
    await load(items.value.length === 1 && currentPage.value > 1 ? currentPage.value - 1 : currentPage.value)
    emit("changed")
  } catch (error) { showError(error.response?.data?.message || error.message) }
  finally { isLoading.value = false }
}
onMounted(() => load(1))
</script>

<template>
  <section class="directory-page">
    <header class="directory-heading"><h1>{{ title }}</h1><MaterialButton color="success" @click="open()">{{ createLabel }}</MaterialButton></header>
    <Filter :input-options="filters" @change="filter" />
    <p v-if="requestError" class="alert alert-danger" role="alert">{{ requestError }}</p>
    <div v-if="isLoading" class="text-center py-4"><span class="spinner-border text-success"></span></div>
    <template v-else>
      <TableSummary class="mb-2" :pagination="paginationMeta" />
      <AppList v-if="items.length" :items="items" :columns="columns" :get-sort-icon="getSortIcon" :disabled="saving"
        @sort="sort" @edit="open" @delete="remove" />
      <p v-else class="text-muted">Записи не найдены.</p>
      <MaterialPagination class="mt-3" :pagination="paginationMeta" @change="go" @pageSizeChange="resize" />
    </template>
    <component :is="formComponent" v-if="opened" :item="selected" :is-saving="saving" :error="saveError" :server-errors="serverErrors" @close="close" @submit="submit" />
  </section>
</template>

<style scoped lang="scss">
.directory-page { padding: 1.5rem; }
.directory-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.directory-heading h1 { font-size: 1.75rem; margin: 0; }
@media(max-width: 575.98px) { .directory-heading { flex-direction: column; align-items: flex-start; } }
</style>
