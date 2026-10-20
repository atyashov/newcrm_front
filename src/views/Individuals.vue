<script setup>
import AppList from "@/components/AppList.vue"
import { apiDelete } from "@/api"
import { onMounted, ref, useCssModule } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import CreateIndividualModal from "@/components/CreateIndividualModal.vue"
import Filter from "@/views/components/Filter.vue"
import {
  fetchIndividuals,
  createIndividual as createIndividualRequest,
  updateIndividual as updateIndividualRequest,
} from "@/services/individualsService"
import { useSorting } from "@/views/components/useSorting"
import { useFiltering } from "@/views/components/useFiltering"
import { usePagination } from "@/views/components/usePagination"
import { useDataList } from "@/views/components/useDataList"
import { useModal } from "@/views/components/useModal"
import { buildQueryParams } from "@/views/components/buildQueryParams"

const styles = useCssModule()

// Composables
const { sortState, toggleSort, getSortIcon, getSortParam } = useSorting()
const { filterState, updateFilters, getFilterParams } = useFiltering()
const {
  pageSize,
  paginationMeta,
  currentPage,
  totalPages,
  updatePaginationMeta,
  canGoToPage,
  changePageSize,
  resetToFirstPage,
} = usePagination(20)
const {
  items: individuals,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchIndividuals)
const {
  isOpen: isCreateModalVisible,
  editingId: editingClientId,
  editingData: editingClientSnapshot,
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
  if (!canGoToPage(page, isLoading.value)) {
    return
  }

  await getList(page, pageSize.value)
}

const handlePageSizeChange = async (newSize) => {
  const nextSize = changePageSize(newSize)
  if (!nextSize) {
    return
  }

  await getList(1, nextSize)
}

const handleOpenCreateModal = () => {
  clearMessages()
  openModal()
}

const handleEditClient = (client) => {
  if (!client) {
    return
  }

  clearMessages()
  openModal(client.id ?? null, client)
}

const handleDeleteClient = async (client) => {
  if (!client || !confirm("Вы уверены, что хотите удалить клиента?")) {
    return
  }

  isLoading.value = true
  const data = await apiDelete(`admin/individuals/${client.id}`)
  isLoading.value = false

  if (data.status === true) {
    individuals.value = individuals.value.filter(
      (item) => item.id !== client.id,
    )
    showSuccess(`Клиент ${client.name} успешно удален.`)
    return
  }

  showError(data.message ?? "Не удалось удалить клиента. Попробуйте позже.")
}

const handleCloseModal = () => {
  closeModal()
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
      ? await updateIndividualRequest(id, payload)
      : await createIndividualRequest(payload)
    const isSuccess =
      response?.status === true ||
      response?.success === true ||
      response?.data?.id ||
      response?.data?.status === true

    if (isSuccess) {
      await getList(currentPage.value)
      handleCloseModal()
      return
    }

    showError(
      response?.message ??
        (isEditMode
          ? "Не удалось обновить клиента. Проверьте данные."
          : "Не удалось создать клиента. Проверьте данные."),
    )
  } catch (error) {
    console.error("Ошибка при сохранении клиента", error)
    showError(
      error?.response?.data?.message ??
        "Произошла ошибка. Попробуйте повторить позже.",
    )
  } finally {
    isSaving.value = false
  }
}

const inputOptions = [
  {
    name: "name",
    placeholder: "ФИО",
    type: "text",
  },
  {
    name: "phone",
    placeholder: "Телефон",
    type: "text",
  },
  {
    name: "email",
    placeholder: "Email",
    type: "text",
  },
  {
    name: "address",
    placeholder: "Адрес",
    type: "text",
  },
]

const handleFilterChange = async (input) => {
  updateFilters(input)
  resetToFirstPage()
  await getList(1, pageSize.value)
}

const handleSort = (field) => {
  toggleSort(field)
  getList(currentPage.value, pageSize.value)
}

onMounted(() => getList(1, pageSize.value))
const listColumns = [
  { key: "name", label: "ФИО", sortable: true, fallback: "Без имени" },
  { key: "phone", label: "Телефон", sortable: true, fallback: "Телефон не указан" },
  { key: "email", label: "Email", sortable: true, fallback: "Email не указан" },
  { key: "address", label: "Адрес", sortable: true, fallback: "Адрес не указан" },
]
</script>

<template>
  <section :class="styles.wrapper">
    <header :class="styles.header">
      <div>
        <h1 :class="styles.title">Физические лица</h1>
        <p :class="styles.subtitle">Управление клиентами</p>
      </div>
      <MaterialButton
        color="success"
        variant="outline"
        @click="handleOpenCreateModal"
      >
        Создать клиента
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
      <p v-if="!individuals.length" class="text-muted">Ничего не найдено.</p>
      <AppList v-else :items="individuals" :columns="listColumns" :get-sort-icon="getSortIcon"
        @sort="handleSort" @edit="handleEditClient" @delete="handleDeleteClient" />
      <div class="row">
        <div class="col-12">
          <MaterialPagination
            :class="styles.paginationWrapper"
            :pagination="paginationMeta"
            color="success"
            size="md"
            @change="goToPage"
            @pageSizeChange="handlePageSizeChange"
          />
        </div>
      </div>
    </div>

    <CreateIndividualModal
      :is-open="isCreateModalVisible"
      :is-saving="isSaving"
      :client-id="editingClientId"
      :initial-data="editingClientSnapshot"
      @close="handleCloseModal"
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
