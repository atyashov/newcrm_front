<script setup>
import { apiDelete } from "@/api"
import { onMounted, ref, useCssModule } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import CreateLegalEntityModal from "@/components/CreateLegalEntityModal.vue"
import Filter from "@/views/components/Filter.vue"
import {
  fetchLegalEntities,
  createLegalEntity as createLegalEntityRequest,
  updateLegalEntity as updateLegalEntityRequest,
} from "@/services/legalEntitiesService"
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
  items: legalEntities,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchLegalEntities)
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
  if (!client || !confirm("Вы уверены, что хотите удалить юридическое лицо?")) {
    return
  }

  isLoading.value = true
  const data = await apiDelete(`admin/legal-entities/${client.id}`)
  isLoading.value = false

  if (data.status === true) {
    legalEntities.value = legalEntities.value.filter(
      (item) => item.id !== client.id,
    )
    showSuccess(
      `Юридическое лицо ${
        client.organization_name || client.contact_name
      } успешно удалено.`,
    )
    return
  }

  showError(
    data.message ?? "Не удалось удалить юридическое лицо. Попробуйте позже.",
  )
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
      ? await updateLegalEntityRequest(id, payload)
      : await createLegalEntityRequest(payload)
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
          ? "Не удалось обновить юридическое лицо. Проверьте данные."
          : "Не удалось создать юридическое лицо. Проверьте данные."),
    )
  } catch (error) {
    console.error("Ошибка при сохранении юридического лица", error)
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
    name: "contact_name",
    placeholder: "Контактное лицо",
    type: "text",
  },
  {
    name: "organization_name",
    placeholder: "Название организации",
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
    name: "legal_address",
    placeholder: "Юридический адрес",
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
</script>

<template>
  <section :class="styles.wrapper">
    <header :class="styles.header">
      <div>
        <h1 :class="styles.title">Юридические лица</h1>
        <p :class="styles.subtitle">Управление юридическими лицами</p>
      </div>
      <MaterialButton color="success" @click="handleOpenCreateModal">
        Создать юридическое лицо
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
      <p v-if="!legalEntities.length" class="text-muted">
        Список пуст. Добавьте первое юридическое лицо.
      </p>
      <ul v-else class="list-group">
        <li
          class="list-group-item list-group-header d-flex justify-content-between align-items-center"
        >
          <span
            class="list-group-item-label d-flex align-items-center gap-1"
            style="cursor: pointer"
            @click="handleSort('contact_name')"
          >
            Контактное лицо
            <i
              v-if="getSortIcon('contact_name')"
              class="material-icons"
              style="font-size: 1rem"
              >{{ getSortIcon("contact_name") }}</i
            >
          </span>
          <span
            class="list-group-item-label d-flex align-items-center gap-1"
            style="cursor: pointer"
            @click="handleSort('organization_name')"
          >
            Организация
            <i
              v-if="getSortIcon('organization_name')"
              class="material-icons"
              style="font-size: 1rem"
              >{{ getSortIcon("organization_name") }}</i
            >
          </span>
          <span
            class="list-group-item-label d-flex align-items-center gap-1"
            style="cursor: pointer"
            @click="handleSort('phone')"
          >
            Телефон
            <i
              v-if="getSortIcon('phone')"
              class="material-icons"
              style="font-size: 1rem"
              >{{ getSortIcon("phone") }}</i
            >
          </span>
          <span
            class="list-group-item-label d-flex align-items-center gap-1"
            style="cursor: pointer"
            @click="handleSort('email')"
          >
            Email
            <i
              v-if="getSortIcon('email')"
              class="material-icons"
              style="font-size: 1rem"
              >{{ getSortIcon("email") }}</i
            >
          </span>
          <span
            class="list-group-item-label d-flex align-items-center gap-1"
            style="cursor: pointer"
            @click="handleSort('legal_address')"
          >
            Адрес
            <i
              v-if="getSortIcon('legal_address')"
              class="material-icons"
              style="font-size: 1rem"
              >{{ getSortIcon("legal_address") }}</i
            >
          </span>
          <span class="list-group-item-label manage"></span>
        </li>
        <li
          v-for="client in legalEntities"
          :key="client.id ?? client.email ?? client.organization_name"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <div
            class="d-flex flex-row justify-content-around w-100 gap-2 align-items-center"
          >
            <span class="list-item">{{
              client.contact_name ?? "Не указано"
            }}</span>
            <span class="list-item">{{
              client.organization_name ?? "Не указано"
            }}</span>
            <span class="list-item">{{
              client.phone ?? "Телефон не указан"
            }}</span>
            <span class="list-item">{{
              client.email ?? "Email не указан"
            }}</span>
            <span class="list-item">{{
              client.legal_address ?? "Адрес не указан"
            }}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <MaterialButton
              color="info"
              variant="outline"
              size="sm"
              class="d-inline-flex align-items-center gap-1"
              @click="handleEditClient(client)"
            >
              <i
                :class="[styles.buttonIcon, 'material-icons']"
                aria-hidden="true"
                >edit</i
              >
            </MaterialButton>
            <MaterialButton
              color="danger"
              variant="outline"
              size="sm"
              class="d-inline-flex align-items-center gap-1"
              @click="handleDeleteClient(client)"
            >
              <i
                :class="[styles.buttonIcon, 'material-icons']"
                aria-hidden="true"
                >delete</i
              >
            </MaterialButton>
          </div>
        </li>
      </ul>
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

    <CreateLegalEntityModal
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

.buttonIcon {
  font-size: 1.4rem !important;
}

.paginationWrapper {
  margin: 15px 0;
}
</style>
