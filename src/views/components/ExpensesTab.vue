<script setup>
import AppList from "@/components/AppList.vue"
import { computed, onMounted, ref, watch } from "vue"
import { useStore } from "vuex"
import { apiDelete } from "@/api"
import CreateExpenseModal from "@/components/CreateExpenseModal.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import ViewExpenseModal from "@/components/ViewExpenseModal.vue"
import { fetchCashBoxes } from "@/services/cashBoxesService"
import { fetchExpenseGroups } from "@/services/expenseGroupsService"
import { createExpense, fetchExpenses, updateExpense } from "@/services/expensesService"
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
const expenseGroupOptions = ref([])
const cashBoxOptions = ref([])

const subdivisionId = computed(() => store.getters["subdivisions/subdivision"] ?? null)
const { toggleSort, getSortIcon, getSortParam } = useSorting()
const { updateFilters, getFilterParams } = useFiltering()
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
  items: expenses,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchExpenses)
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

const flattenGroups = (groups) => groups.flatMap((group) => [
  { value: group.id, label: group.title ?? "Без названия" },
  ...(group.children ?? []).map((child) => ({
    value: child.id,
    label: `${group.title ?? "Без названия"} / ${child.title ?? "Без названия"}`,
  })),
])

const loadOptions = async () => {
  const [groupsResponse, cashBoxesResponse] = await Promise.all([
    fetchExpenseGroups(),
    fetchCashBoxes({ page_size: 500 }),
  ])
  expenseGroupOptions.value = flattenGroups(groupsResponse?.data ?? [])
  cashBoxOptions.value = (cashBoxesResponse?.data ?? []).map((cashBox) => ({
    value: cashBox.id,
    label: cashBox.title ?? "Без названия",
  }))
}

const inputOptions = computed(() => [
  { name: "date", placeholder: "Дата", type: "date" },
  { name: "price", placeholder: "Цена", type: "text" },
  { name: "quantity", placeholder: "Количество", type: "text" },
  { name: "amount", placeholder: "Сумма", type: "text" },
  { name: "expense_group_id", placeholder: "Группа расходов", type: "select", options: expenseGroupOptions.value },
  { name: "cash_box_id", placeholder: "Касса", type: "select", options: cashBoxOptions.value },
])

const getList = async (page = 1, perPage = pageSize.value) => {
  const filters = { ...getFilterParams() }
  if (subdivisionId.value) filters.subdivision_id = subdivisionId.value

  const params = buildQueryParams({
    page,
    perPage,
    filters,
    sort: getSortParam(),
  })

  await loadData(params, (response) => {
    if (response?.pagination) updatePaginationMeta(response.pagination, page, perPage)
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
  if (canGoToPage(page, isLoading.value)) await getList(page, pageSize.value)
}

const handlePageSizeChange = async (size) => {
  const nextSize = changePageSize(size)
  if (nextSize) await getList(1, nextSize)
}

const openCreate = () => {
  clearMessages()
  openForm()
}

const handleEdit = (expense) => {
  closeView()
  clearMessages()
  openForm(expense.id, expense)
}

const handleDelete = async (expense) => {
  if (!confirm(`Удалить расход от ${expense.date}?`)) return

  try {
    isLoading.value = true
    clearMessages()
    const response = await apiDelete(`admin/expenses/${expense.id}`)
    if (response?.status === true) {
      await getList(currentPage.value, pageSize.value)
      showSuccess("Расход удалён.")
      return
    }
    showError(response?.message ?? "Не удалось удалить расход.")
  } catch (error) {
    console.error("Ошибка при удалении расхода", error)
    showError(error?.response?.data?.message ?? "Не удалось удалить расход.")
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async ({ mode, payload, id }) => {
  if (isSaving.value) return

  try {
    isSaving.value = true
    clearMessages()
    const response = mode === "edit" && id
      ? await updateExpense(id, payload)
      : await createExpense(payload)

    if (response?.status === true || response?.success === true || response?.data?.status === true) {
      closeForm()
      await getList(currentPage.value, pageSize.value)
      return
    }
    showError(response?.message ?? "Не удалось сохранить расход.")
  } catch (error) {
    console.error("Ошибка при сохранении расхода", error)
    showError(error?.response?.data?.message ?? "Не удалось сохранить расход.")
  } finally {
    isSaving.value = false
  }
}

const formatMoney = (value) => new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value) || 0)

watch(subdivisionId, () => getList(1, pageSize.value))
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
  { key: "price", label: "Цена", sortable: true, format: (item) => formatMoney(item.price) },
  { key: "quantity", label: "Количество", sortable: true },
  { key: "amount", label: "Сумма", sortable: true, format: (item) => formatMoney(item.amount) },
  { key: "expense_group", label: "Группа расходов", format: (item) => item.expense_group?.title ?? "Не указана" },
  { key: "cash_box", label: "Касса", format: (item) => item.cash_box?.title ?? "Не указана" },
]
</script>

<template>
  <div>
    <Filter class="expense-filter" :input-options="inputOptions" @change="handleFilterChange" />

    <div v-if="requestError" class="alert alert-danger">{{ requestError }}</div>
    <div v-if="requestSuccess" class="alert alert-success">{{ requestSuccess }}</div>
    <div v-if="isLoading" class="text-center py-4">
      <span class="spinner-border text-success" role="status"></span>
    </div>

    <div v-else>
      <TableSummary class="mb-2" :pagination="paginationMeta" />
      <p v-if="!expenses.length" class="text-muted">Расходы не найдены.</p>
      <AppList v-else :items="expenses" :columns="listColumns" :get-sort-icon="getSortIcon"
        view @sort="handleSort" @view="openView($event.id, $event)" @edit="handleEdit" @delete="handleDelete" />

      <MaterialPagination class="mt-3" :pagination="paginationMeta" color="success" @change="goToPage" @pageSizeChange="handlePageSizeChange" />
    </div>

    <CreateExpenseModal
      :is-open="isFormOpen"
      :is-saving="isSaving"
      :expense-id="editingId"
      :initial-data="editingData"
      :subdivision-id="subdivisionId"
      :expense-group-options="expenseGroupOptions"
      :cash-box-options="cashBoxOptions"
      @close="closeForm"
      @submit="handleSubmit"
    />
    <ViewExpenseModal
      :is-open="isViewOpen"
      :expense-id="viewingId"
      :initial-data="viewingData"
      @close="closeView"
      @edit="handleEdit"
    />
  </div>
</template>

<style scoped lang="scss">
.expense-filter {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem;
}

.expense-filter :deep(.input-group),
.expense-filter :deep(.form-select) {
  width: 100%;
}

</style>
