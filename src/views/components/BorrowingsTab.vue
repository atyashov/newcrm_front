<script setup>
import AppList from "@/components/AppList.vue"
import { computed, onMounted, ref, watch } from "vue"
import { useStore } from "vuex"
import { apiDelete } from "@/api"
import CreateBorrowingModal from "@/components/CreateBorrowingModal.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import ViewBorrowingModal from "@/components/ViewBorrowingModal.vue"
import {
  createBorrowing,
  fetchBorrowings,
  updateBorrowing,
} from "@/services/borrowingsService"
import { fetchCashBoxes } from "@/services/cashBoxesService"
import Filter from "@/views/components/Filter.vue"
import { buildQueryParams } from "@/views/components/buildQueryParams"
import { useDataList } from "@/views/components/useDataList"
import { useFiltering } from "@/views/components/useFiltering"
import { useModal } from "@/views/components/useModal"
import { usePagination } from "@/views/components/usePagination"
import { useSorting } from "@/views/components/useSorting"

const props = defineProps({
  openCreateRequest: {
    type: Number,
    default: 0,
  },
})

const store = useStore()
const isSaving = ref(false)
const cashBoxOptions = ref([])
const now = new Date()
const defaultDateFrom = `${now.getFullYear()}-${String(
  now.getMonth() + 1,
).padStart(2, "0")}-01`

const currentSubdivisionId = computed(
  () => store.getters["subdivisions/subdivision"] ?? null,
)
const subdivisionOptions = computed(() =>
  (store.getters["subdivisions/subdivisions"] ?? []).map((subdivision) => ({
    value: subdivision.id,
    label: subdivision.title ?? "Без названия",
  })),
)

const { toggleSort, getSortIcon, getSortParam } = useSorting()
const { updateFilters, getFilterParams, setFilter } = useFiltering()
setFilter("date_from", defaultDateFrom)
const {
  pageSize,
  paginationMeta,
  currentPage,
  updatePaginationMeta,
  canGoToPage,
  changePageSize,
  resetToFirstPage,
} = usePagination(20)
const {
  items: borrowings,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchBorrowings)
const {
  isOpen: isFormOpen,
  editingId,
  editingData,
  open: openForm,
  close: closeForm,
} = useModal()
const {
  isOpen: isViewOpen,
  editingId: viewingId,
  editingData: viewingData,
  open: openView,
  close: closeView,
} = useModal()

const inputOptions = computed(() => [
  { name: "title", placeholder: "Название", type: "text" },
  { name: "amount", placeholder: "Сумма", type: "text" },
  {
    name: "date_from",
    placeholder: "Дата от",
    type: "date",
    value: defaultDateFrom,
  },
  {
    name: "subdivision_sender_id",
    placeholder: "Подразделение-отправитель",
    type: "select",
    options: subdivisionOptions.value,
  },
  {
    name: "subdivision_receiver_id",
    placeholder: "Подразделение-получатель",
    type: "select",
    options: subdivisionOptions.value,
  },
  {
    name: "cash_box_sender_id",
    placeholder: "Касса-отправитель",
    type: "select",
    options: cashBoxOptions.value,
  },
  {
    name: "cash_box_receiver_id",
    placeholder: "Касса-получатель",
    type: "select",
    options: cashBoxOptions.value,
  },
])

const loadOptions = async () => {
  const response = await fetchCashBoxes({ page_size: 500 })
  cashBoxOptions.value = (response?.data ?? []).map((cashBox) => ({
    value: cashBox.id,
    label: cashBox.title ?? "Без названия",
  }))
}

const getList = async (page = 1, perPage = pageSize.value) => {
  const filters = { ...getFilterParams() }
  if (currentSubdivisionId.value) {
    filters.subdivision_id = currentSubdivisionId.value
  }

  const params = buildQueryParams({
    page,
    perPage,
    filters,
    sort: getSortParam(),
  })

  await loadData(params, (response) => {
    if (response?.pagination) {
      updatePaginationMeta(response.pagination, page, perPage)
    }
  })
}

const handleFilterChange = async (values) => {
  updateFilters(values)
  resetToFirstPage()
  await getList(1, pageSize.value)
}

const handleSort = async (field) => {
  toggleSort(field)
  resetToFirstPage()
  await getList(1, pageSize.value)
}

const goToPage = async (page) => {
  if (canGoToPage(page, isLoading.value)) {
    await getList(page, pageSize.value)
  }
}

const handlePageSizeChange = async (size) => {
  const nextSize = changePageSize(size)
  if (nextSize) await getList(1, nextSize)
}

const openCreate = () => {
  clearMessages()
  openForm()
}

const handleEdit = (borrowing) => {
  closeView()
  clearMessages()
  openForm(borrowing.id, borrowing)
}

const handleDelete = async (borrowing) => {
  if (!confirm(`Удалить займ «${borrowing.title}»?`)) return

  try {
    isLoading.value = true
    clearMessages()
    const response = await apiDelete(`admin/borrowings/${borrowing.id}`)

    if (response?.status === true) {
      await getList(currentPage.value, pageSize.value)
      showSuccess(`Займ «${borrowing.title}» удалён.`)
      return
    }

    showError(response?.message ?? "Не удалось удалить займ.")
  } catch (error) {
    console.error("Ошибка при удалении займа", error)
    showError(error?.response?.data?.message ?? "Не удалось удалить займ.")
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async ({ mode, payload, id }) => {
  if (isSaving.value) return

  try {
    isSaving.value = true
    clearMessages()
    const response =
      mode === "edit" && id
        ? await updateBorrowing(id, payload)
        : await createBorrowing(payload)

    if (
      response?.status === true ||
      response?.success === true ||
      response?.data?.status === true
    ) {
      closeForm()
      await getList(currentPage.value, pageSize.value)
      return
    }

    showError(response?.message ?? "Не удалось сохранить займ.")
  } catch (error) {
    console.error("Ошибка при сохранении займа", error)
    showError(error?.response?.data?.message ?? "Не удалось сохранить займ.")
  } finally {
    isSaving.value = false
  }
}

const formatMoney = (value) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

watch(currentSubdivisionId, () => getList(1, pageSize.value))
watch(
  () => props.openCreateRequest,
  (request) => {
    if (request > 0) openCreate()
  },
  { immediate: true },
)

onMounted(async () => {
  await loadOptions()
  await getList(1, pageSize.value)
})
const listColumns = [
  { key: "date", label: "Дата", sortable: true },
  { key: "title", label: "Название", sortable: true },
  { key: "amount", label: "Сумма", sortable: true, format: (item) => formatMoney(item.amount) },
  { key: "sender", label: "Отправитель" },
  { key: "receiver", label: "Получатель" },
]
</script>

<template>
  <div>
    <Filter class="borrowing-filter" :input-options="inputOptions" @change="handleFilterChange" />

    <div v-if="requestError" class="alert alert-danger">{{ requestError }}</div>
    <div v-if="requestSuccess" class="alert alert-success">{{ requestSuccess }}</div>
    <div v-if="isLoading" class="text-center py-4">
      <span class="spinner-border text-success" role="status"></span>
    </div>

    <div v-else>
      <TableSummary class="mb-2" :pagination="paginationMeta" />
      <p v-if="!borrowings.length" class="text-muted">Займы не найдены.</p>
      <AppList v-else :items="borrowings" :columns="listColumns" :get-sort-icon="getSortIcon"
        view @sort="handleSort" @view="openView($event.id, $event)" @edit="handleEdit" @delete="handleDelete">
        <template #cell-sender="{ item }"><p>{{ item.subdivision_sender?.title ?? "Не указан" }}</p><p>{{ item.cash_box_sender?.title ?? "Касса не указана" }}</p></template>
        <template #cell-receiver="{ item }"><p>{{ item.subdivision_receiver?.title ?? "Не указан" }}</p><p>{{ item.cash_box_receiver?.title ?? "Касса не указана" }}</p></template>
      </AppList>

      <MaterialPagination
        class="mt-3"
        :pagination="paginationMeta"
        color="success"
        @change="goToPage"
        @pageSizeChange="handlePageSizeChange"
      />
    </div>

    <CreateBorrowingModal
      :is-open="isFormOpen"
      :is-saving="isSaving"
      :borrowing-id="editingId"
      :initial-data="editingData"
      :current-subdivision-id="currentSubdivisionId"
      :subdivision-options="subdivisionOptions"
      :cash-box-options="cashBoxOptions"
      @close="closeForm"
      @submit="handleSubmit"
    />
    <ViewBorrowingModal
      :is-open="isViewOpen"
      :borrowing-id="viewingId"
      :initial-data="viewingData"
      @close="closeView"
      @edit="handleEdit"
    />
  </div>
</template>

<style scoped lang="scss">
.borrowing-filter {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem;
}

.borrowing-filter :deep(.input-group),
.borrowing-filter :deep(.form-select) {
  width: 100%;
}

</style>
