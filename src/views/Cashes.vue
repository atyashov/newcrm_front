<script setup>
import AppList from "@/components/AppList.vue"
import { computed, onMounted, reactive, ref, useCssModule, watch } from "vue"
import { apiDelete } from "@/api"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import CreateCashBoxModal from "@/components/CreateCashBoxModal.vue"
import ViewCashBoxModal from "@/components/ViewCashBoxModal.vue"
import Filter from "@/views/components/Filter.vue"
import BorrowingsTab from "@/views/components/BorrowingsTab.vue"
import ExpensesTab from "@/views/components/ExpensesTab.vue"
import { useDataList } from "@/views/components/useDataList"
import { useModal } from "@/views/components/useModal"
import { useSorting } from "@/views/components/useSorting"
import {
  createCashBox,
  fetchCashBoxes,
  updateCashBox,
} from "@/services/cashBoxesService"

const styles = useCssModule()
const { toggleSort, getSortIcon, getSortParam } = useSorting()

const activeTab = ref("cashes")
const hasOpenedExpenses = ref(false)
const hasOpenedBorrowings = ref(false)
const expenseModalRequest = ref(0)
const borrowingModalRequest = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const isSaving = ref(false)
const filters = reactive({
  title: "",
  balance: "",
  payment_method_id: "",
  sort_order: "",
  is_dashboard: "",
})

const {
  items: cashBoxes,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchCashBoxes)

const {
  isOpen: isFormModalOpen,
  editingId,
  editingData,
  open: openFormModal,
  close: closeFormModal,
} = useModal()

const {
  isOpen: isViewModalOpen,
  editingId: viewingId,
  editingData: viewingData,
  open: openViewModal,
  close: closeViewModal,
} = useModal()

const paymentMethodOptions = computed(() => {
  const methods = new Map()

  cashBoxes.value.forEach((cashBox) => {
    const method = cashBox.payment_method
    if (method?.id) {
      methods.set(method.id, method.title ?? "Без названия")
    }
  })

  return Array.from(methods, ([value, label]) => ({ value, label }))
})

const inputOptions = computed(() => [
  { name: "title", placeholder: "Название", type: "text" },
  { name: "balance", placeholder: "Баланс", type: "text" },
  {
    name: "payment_method_id",
    placeholder: "Метод оплаты",
    type: "select",
    options: paymentMethodOptions.value,
  },
  { name: "sort_order", placeholder: "Сортировка", type: "text" },
  {
    name: "is_dashboard",
    placeholder: "На панели управления",
    type: "select",
    options: [
      { value: "1", label: "Да" },
      { value: "0", label: "Нет" },
    ],
  },
])

const filteredCashBoxes = computed(() =>
  cashBoxes.value.filter((cashBox) => {
    const titleMatches = String(cashBox.title ?? "")
      .toLowerCase()
      .includes(filters.title.trim().toLowerCase())
    const balanceMatches =
      !filters.balance || String(cashBox.balance ?? "").includes(filters.balance)
    const paymentMethodMatches =
      !filters.payment_method_id ||
      String(cashBox.payment_method_id) === String(filters.payment_method_id)
    const sortOrderMatches =
      !filters.sort_order ||
      String(cashBox.sort_order ?? "").includes(filters.sort_order)
    const dashboardMatches =
      filters.is_dashboard === "" ||
      Number(Boolean(cashBox.is_dashboard)) === Number(filters.is_dashboard)

    return (
      titleMatches &&
      balanceMatches &&
      paymentMethodMatches &&
      sortOrderMatches &&
      dashboardMatches
    )
  }),
)

const getSortValue = (cashBox, field) => {
  if (field === "payment_method") {
    return cashBox.payment_method?.title ?? ""
  }

  return cashBox[field]
}

const sortedCashBoxes = computed(() => {
  const sortParam = getSortParam()
  if (!sortParam) {
    return filteredCashBoxes.value
  }

  const isDescending = sortParam.startsWith("-")
  const field = isDescending ? sortParam.slice(1) : sortParam
  const direction = isDescending ? -1 : 1

  return [...filteredCashBoxes.value].sort((firstCashBox, secondCashBox) => {
    const firstValue = getSortValue(firstCashBox, field)
    const secondValue = getSortValue(secondCashBox, field)

    if (["balance", "sort_order", "is_dashboard"].includes(field)) {
      return (Number(firstValue ?? 0) - Number(secondValue ?? 0)) * direction
    }

    return String(firstValue ?? "").localeCompare(String(secondValue ?? ""), "ru", {
      sensitivity: "base",
    }) * direction
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredCashBoxes.value.length / pageSize.value)),
)

const paginatedCashBoxes = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedCashBoxes.value.slice(start, start + pageSize.value)
})

const paginationMeta = computed(() => ({
  current_page: currentPage.value,
  last_page: totalPages.value,
  per_page: pageSize.value,
  total: filteredCashBoxes.value.length,
  links: [],
}))

const formatBalance = (value) => {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(number)
    : "0,00"
}

const refresh = async () => {
  await loadData({ page_size: 500 })
}

const handleFilterChange = (values) => {
  Object.assign(filters, values)
  currentPage.value = 1
}

const handlePageChange = (page) => {
  currentPage.value = page
}

const handlePageSizeChange = (size) => {
  pageSize.value = Number(size)
  currentPage.value = 1
}

const handleSort = (field) => {
  toggleSort(field)
  currentPage.value = 1
}

const handleOpenCreate = () => {
  activeTab.value = "cashes"
  clearMessages()
  openFormModal()
}

const handleOpenExpense = () => {
  hasOpenedExpenses.value = true
  activeTab.value = "expenses"
  expenseModalRequest.value += 1
}

const handleShowExpenses = () => {
  hasOpenedExpenses.value = true
  activeTab.value = "expenses"
}

const handleOpenLoan = () => {
  hasOpenedBorrowings.value = true
  activeTab.value = "loans"
  borrowingModalRequest.value += 1
}

const handleShowBorrowings = () => {
  hasOpenedBorrowings.value = true
  activeTab.value = "loans"
}

const handleView = (cashBox) => {
  clearMessages()
  openViewModal(cashBox.id, cashBox)
}

const handleEdit = (cashBox) => {
  closeViewModal()
  clearMessages()
  openFormModal(cashBox.id, cashBox)
}

const handleDelete = async (cashBox) => {
  if (!confirm(`Удалить кассу «${cashBox.title}»?`)) {
    return
  }

  try {
    isLoading.value = true
    clearMessages()
    const response = await apiDelete(`admin/cash-boxes/${cashBox.id}`)

    if (response?.status === true) {
      await refresh()
      showSuccess(`Касса «${cashBox.title}» удалена.`)
      return
    }

    showError(response?.message ?? "Не удалось удалить кассу.")
  } catch (error) {
    console.error("Ошибка при удалении кассы", error)
    showError(error?.response?.data?.message ?? "Не удалось удалить кассу.")
  } finally {
    isLoading.value = false
  }
}

const handleFormSubmit = async ({ mode, payload, id }) => {
  if (isSaving.value) {
    return
  }

  try {
    isSaving.value = true
    clearMessages()

    const isEditMode = mode === "edit" && id
    const response = isEditMode
      ? await updateCashBox(id, payload)
      : await createCashBox(payload)

    if (
      response?.status === true ||
      response?.success === true ||
      response?.data?.status === true
    ) {
      await refresh()
      closeFormModal()
      return
    }

    showError(
      response?.message ??
        `Не удалось ${isEditMode ? "обновить" : "создать"} кассу.`,
    )
  } catch (error) {
    console.error("Ошибка при сохранении кассы", error)
    showError(error?.response?.data?.message ?? "Не удалось сохранить кассу.")
  } finally {
    isSaving.value = false
  }
}

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages
  }
})

onMounted(refresh)
const listColumns = [
  { key: "title", label: "Название", sortable: true },
  { key: "balance", label: "Баланс", sortable: true, format: (item) => formatBalance(item.balance) },
  { key: "payment_method", label: "Метод оплаты", sortable: true, format: (item) => item.payment_method?.title ?? "Не указан" },
  { key: "sort_order", label: "Сортировка", sortable: true },
  { key: "is_dashboard", label: "На панели", sortable: true, format: (item) => item.is_dashboard ? "Да" : "Нет" },
]
</script>

<template>
  <section :class="styles.wrapper">
    <header :class="styles.header">
      <div>
        <h1 :class="styles.title">Кассы</h1>
        <p :class="styles.subtitle">Управление кассами и операциями</p>
      </div>
    </header>

    <div :class="styles.navigationRow">
      <div class="tabs">
        <button
          type="button"
          :class="['tab', activeTab === 'cashes' ? 'tab-active' : '']"
          @click="activeTab = 'cashes'"
        >
          Кассы
        </button>
        <button
          type="button"
          :class="['tab', activeTab === 'expenses' ? 'tab-active' : '']"
          @click="handleShowExpenses"
        >
          Расходы
        </button>
        <button
          type="button"
          :class="['tab', activeTab === 'loans' ? 'tab-active' : '']"
          @click="handleShowBorrowings"
        >
          Займы
        </button>
      </div>

      <div :class="styles.actions">
        <MaterialButton color="success" @click="handleOpenCreate">
          Добавить кассу
        </MaterialButton>
        <MaterialButton color="warning" @click="handleOpenExpense">
          Добавить расход
        </MaterialButton>
        <MaterialButton color="info" @click="handleOpenLoan">
          Добавить займ
        </MaterialButton>
      </div>
    </div>

    <template v-if="activeTab === 'cashes'">
      <Filter :input-options="inputOptions" @change="handleFilterChange" />

      <div v-if="requestError" class="alert alert-danger" role="alert">
        {{ requestError }}
      </div>
      <div v-if="requestSuccess" class="alert alert-success" role="alert">
        {{ requestSuccess }}
      </div>

      <div v-if="isLoading" class="text-center py-4">
        <span class="spinner-border text-success" role="status"></span>
      </div>

      <div v-else>
        <TableSummary class="mb-2" :pagination="paginationMeta" />
        <p v-if="!paginatedCashBoxes.length" class="text-muted">
          Кассы не найдены.
        </p>

        <AppList v-else :items="paginatedCashBoxes" :columns="listColumns" :get-sort-icon="getSortIcon"
        view @sort="handleSort" @view="handleView" @edit="handleEdit" @delete="handleDelete" />

        <MaterialPagination
          :class="styles.pagination"
          :pagination="paginationMeta"
          color="success"
          size="md"
          @change="handlePageChange"
          @pageSizeChange="handlePageSizeChange"
        />
      </div>
    </template>

    <ExpensesTab
      v-if="hasOpenedExpenses"
      v-show="activeTab === 'expenses'"
      :open-create-request="expenseModalRequest"
    />

    <BorrowingsTab
      v-if="hasOpenedBorrowings"
      v-show="activeTab === 'loans'"
      :open-create-request="borrowingModalRequest"
    />

    <CreateCashBoxModal
      :is-open="isFormModalOpen"
      :is-saving="isSaving"
      :cash-box-id="editingId"
      :initial-data="editingData"
      @close="closeFormModal"
      @submit="handleFormSubmit"
    />

    <ViewCashBoxModal
      :is-open="isViewModalOpen"
      :cash-box-id="viewingId"
      :initial-data="viewingData"
      @close="closeViewModal"
      @edit="handleEdit"
    />
  </section>
</template>

<style module lang="scss">
.wrapper {
  padding: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #6c757d;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.navigationRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 1rem;
}

@media (max-width: 991.98px) {
  .header {
    flex-direction: column;
  }

  .navigationRow {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>


