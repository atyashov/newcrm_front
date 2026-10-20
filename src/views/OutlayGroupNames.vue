<script setup>
import AppList from "@/components/AppList.vue"
import { computed, ref, watch } from "vue"
import { useStore } from "vuex"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import CreateOutlayGroupNameModal from "@/components/CreateOutlayGroupNameModal.vue"
import Filter from "@/views/components/Filter.vue"
import { usePagination } from "@/views/components/usePagination"
import { useSorting } from "@/views/components/useSorting"
import { useFiltering } from "@/views/components/useFiltering"
import { useModal } from "@/views/components/useModal"
import { buildQueryParams } from "@/views/components/buildQueryParams"
import { fetchOutlayGroupNames, createOutlayGroupName, updateOutlayGroupName, deleteOutlayGroupName } from "@/services/outlayGroupNamesService"

const store = useStore()
const subdivisionId = computed(() => store.getters["subdivisions/subdivision"])
const groups = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const deletingId = ref(null)
const error = ref("")
const formError = ref("")
let loadVersion = 0
const { pageSize, paginationMeta, currentPage, updatePaginationMeta, changePageSize, canGoToPage, resetToFirstPage } = usePagination(20)
const { toggleSort, getSortIcon, getSortParam } = useSorting()
const { updateFilters, getFilterParams } = useFiltering()
const { isOpen, editingId, editingData, open, close } = useModal()
const inputOptions = [{ name: "name", placeholder: "Название", type: "text" }]
const errorText = (err) => err?.response?.data?.message || err?.message || "Не удалось выполнить запрос."

const getList = async (page = 1) => {
  const version = ++loadVersion
  error.value = ""
  if (!subdivisionId.value) {
    groups.value = []
    updatePaginationMeta(null, 1, pageSize.value)
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    const result = await fetchOutlayGroupNames(buildQueryParams({
      page, perPage: pageSize.value, sort: getSortParam(),
      filters: { ...getFilterParams(), subdivision_id: subdivisionId.value },
    }))
    if (version !== loadVersion) return
    groups.value = result.data
    updatePaginationMeta(result.pagination, page, pageSize.value)
  } catch (err) {
    if (version === loadVersion) error.value = errorText(err)
  } finally {
    if (version === loadVersion) isLoading.value = false
  }
}
const openForm = (group = null) => {
  formError.value = ""
  open(group?.id ?? null, group)
}
const save = async (payload) => {
  if (isSaving.value || !subdivisionId.value) return
  const subdivision = subdivisionId.value
  isSaving.value = true
  formError.value = ""
  try {
    const data = { ...payload, subdivision_id: subdivision }
    const result = editingId.value
      ? await updateOutlayGroupName(editingId.value, data)
      : await createOutlayGroupName(data)
    if (result?.status !== true) throw new Error(result?.message || "Не удалось сохранить группу.")
    if (subdivision === subdivisionId.value) {
      close()
      await getList(currentPage.value)
    }
  } catch (err) {
    if (subdivision === subdivisionId.value) formError.value = errorText(err)
  } finally {
    isSaving.value = false
  }
}
const remove = async (group) => {
  if (deletingId.value || !confirm(`Удалить группу «${group.name}»?`)) return
  const subdivision = subdivisionId.value
  deletingId.value = group.id
  error.value = ""
  try {
    const result = await deleteOutlayGroupName(group.id, subdivision)
    if (result?.status !== true) throw new Error(result?.message || "Не удалось удалить группу.")
    if (subdivision === subdivisionId.value) {
      const page = groups.value.length === 1 ? Math.max(1, currentPage.value - 1) : currentPage.value
      await getList(page)
    }
  } catch (err) {
    if (subdivision === subdivisionId.value) error.value = errorText(err)
  } finally {
    deletingId.value = null
  }
}
const filterChanged = (values) => {
  updateFilters(values)
  resetToFirstPage()
  getList()
}
const sort = () => {
  toggleSort("name")
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
  groups.value = []
  resetToFirstPage()
  getList()
}, { immediate: true })
const listColumns = [
  { key: "name", label: "Название", sortable: true },
]
</script>

<template>
  <section class="group-names-page">
    <header class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <h1 class="mb-0">Группы товаров в смете</h1>
      <MaterialButton color="success" :disabled="!subdivisionId || isSaving" @click="openForm()">Создать группу</MaterialButton>
    </header>
    <p v-if="!subdivisionId" class="text-muted">Выберите подразделение в шапке.</p>
    <template v-else>
      <Filter :input-options="inputOptions" @change="filterChanged" />
      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <div v-if="isLoading" class="text-center py-4"><span class="spinner-border text-success" role="status"></span></div>
      <template v-else>
        <TableSummary class="mb-2" :pagination="paginationMeta" />
        <p v-if="!groups.length" class="text-muted">Группы не найдены.</p>
        <AppList v-else :items="groups" :columns="listColumns" :get-sort-icon="getSortIcon"
        :edit-disabled="isSaving || deletingId !== null" :delete-disabled="deletingId !== null" @sort="sort" @edit="openForm" @delete="remove" />
        <MaterialPagination class="mt-3" :pagination="paginationMeta" :page-size-options="[20, 50, 100]" @change="goToPage" @pageSizeChange="resize" />
      </template>
    </template>
    <CreateOutlayGroupNameModal :is-open="isOpen" :initial-data="editingData" :is-saving="isSaving" :error="formError" @close="close" @submit="save" />
  </section>
</template>

<style scoped lang="scss">
</style>
