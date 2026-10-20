<script setup>
import AppList from "@/components/AppList.vue"
import { onMounted, ref, useCssModule } from "vue"
import { apiDelete } from "@/api"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import CreatePaymentMethodModal from "@/components/CreatePaymentMethodModal.vue"
import Filter from "@/views/components/Filter.vue"
import { buildQueryParams } from "@/views/components/buildQueryParams"
import { useDataList } from "@/views/components/useDataList"
import { useFiltering } from "@/views/components/useFiltering"
import { useModal } from "@/views/components/useModal"
import { usePagination } from "@/views/components/usePagination"
import { useSorting } from "@/views/components/useSorting"
import {
  createPaymentMethod,
  fetchPaymentMethods,
  updatePaymentMethod,
} from "@/services/paymentMethodsService"

const styles = useCssModule()

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
  items: paymentMethods,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchPaymentMethods)
const {
  isOpen: isModalVisible,
  editingId,
  editingData,
  open: openModal,
  close: closeModal,
} = useModal()

const isSaving = ref(false)

const getList = async (page = 1, perPage = pageSize.value) => {
  const params = buildQueryParams({
    page,
    perPage,
    filters: getFilterParams(),
    sort: getSortParam(),
  })

  await loadData(params, (response) => {
    if (response?.pagination) {
      updatePaginationMeta(response.pagination, page, perPage)
    }
  })
}

const goToPage = async (page) => {
  if (canGoToPage(page, isLoading.value)) {
    await getList(page, pageSize.value)
  }
}

const handlePageSizeChange = async (newSize) => {
  const nextSize = changePageSize(newSize)
  if (nextSize) {
    await getList(1, nextSize)
  }
}

const handleOpenCreateModal = () => {
  clearMessages()
  openModal()
}

const handleEdit = (paymentMethod) => {
  clearMessages()
  openModal(paymentMethod.id, paymentMethod)
}

const handleDelete = async (paymentMethod) => {
  if (!confirm(`Удалить способ оплаты «${paymentMethod.title}»?`)) {
    return
  }

  try {
    isLoading.value = true
    clearMessages()
    const response = await apiDelete(
      `admin/payment-methods/${paymentMethod.id}`,
    )

    if (response?.status === true) {
      await getList(currentPage.value, pageSize.value)
      showSuccess(`Способ оплаты «${paymentMethod.title}» удалён.`)
      return
    }

    showError(response?.message ?? "Не удалось удалить способ оплаты.")
  } catch (error) {
    console.error("Ошибка при удалении способа оплаты", error)
    showError(
      error?.response?.data?.message ?? "Не удалось удалить способ оплаты.",
    )
  } finally {
    isLoading.value = false
  }
}

const handleModalSubmit = async ({ mode, payload, id }) => {
  if (isSaving.value) {
    return
  }

  try {
    isSaving.value = true
    clearMessages()

    const isEditMode = mode === "edit" && id
    const response = isEditMode
      ? await updatePaymentMethod(id, payload)
      : await createPaymentMethod(payload)

    if (
      response?.status === true ||
      response?.success === true ||
      response?.data?.status === true
    ) {
      await getList(currentPage.value, pageSize.value)
      closeModal()
      return
    }

    showError(
      response?.message ??
        `Не удалось ${isEditMode ? "обновить" : "создать"} способ оплаты.`,
    )
  } catch (error) {
    console.error("Ошибка при сохранении способа оплаты", error)
    showError(
      error?.response?.data?.message ?? "Не удалось сохранить способ оплаты.",
    )
  } finally {
    isSaving.value = false
  }
}

const handleFilterChange = async (input) => {
  updateFilters(input)
  resetToFirstPage()
  await getList(1, pageSize.value)
}

const handleSort = () => {
  toggleSort("title")
  getList(currentPage.value, pageSize.value)
}

const inputOptions = [
  {
    name: "title",
    placeholder: "Название",
    type: "text",
  },
]

onMounted(() => getList(1, pageSize.value))
const listColumns = [
  { key: "title", label: "Название", sortable: true, fallback: "Без названия" },
]
</script>

<template>
  <section :class="styles.wrapper">
    <header :class="styles.header">
      <div>
        <h1 :class="styles.title">Способы оплаты</h1>
        <p :class="styles.subtitle">Управление способами оплаты</p>
      </div>
      <MaterialButton color="success" @click="handleOpenCreateModal">
        Создать способ оплаты
      </MaterialButton>
    </header>

    <Filter :input-options="inputOptions" @change="handleFilterChange" />

    <div v-if="requestError" class="alert alert-danger" role="alert">
      {{ requestError }}
    </div>
    <div v-if="requestSuccess" class="alert alert-success" role="alert">
      {{ requestSuccess }}
    </div>

    <div v-if="isLoading" class="text-center py-4">
      <span
        class="spinner-border text-success"
        role="status"
        aria-hidden="true"
      ></span>
    </div>

    <div v-else>
      <TableSummary class="mb-2" :pagination="paginationMeta" />
      <p v-if="!paymentMethods.length" class="text-muted">
        Список способов оплаты пуст.
      </p>

      <AppList v-else :items="paymentMethods" :columns="listColumns" :get-sort-icon="getSortIcon"
        @sort="handleSort" @edit="handleEdit" @delete="handleDelete" />

      <MaterialPagination
        :class="styles.paginationWrapper"
        :pagination="paginationMeta"
        color="success"
        size="md"
        @change="goToPage"
        @pageSizeChange="handlePageSizeChange"
      />
    </div>

    <CreatePaymentMethodModal
      :is-open="isModalVisible"
      :is-saving="isSaving"
      :payment-method-id="editingId"
      :initial-data="editingData"
      @close="closeModal"
      @submit="handleModalSubmit"
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
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
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

.paginationWrapper {
  margin: 15px 0;
}
</style>
