<script setup>
import { apiDelete } from "@/api"
import { onMounted, ref, useCssModule } from "vue"
import { useSorting } from "@/views/components/useSorting"
import { useFiltering } from "@/views/components/useFiltering"
import { usePagination } from "@/views/components/usePagination"
import { useDataList } from "@/views/components/useDataList"
import { useModal } from "@/views/components/useModal"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import { buildQueryParams } from "@/views/components/buildQueryParams"
import Filter from "@/views/components/Filter.vue"
import CreateRoleModal from "../components/CreateRoleModal.vue"
import {
  fetchRoles,
  createRole as createRoleRequest,
  updateRole as updateRoleRequest,
} from "../services/rolesService"
const styles = useCssModule()

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
  items: roles,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchRoles)
const {
  isOpen: isCreateModalVisible,
  editingId: editingRoleId,
  editingData: editingRoleSnapshot,
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

const handleEditRole = (role) => {
  if (!role) {
    return
  }

  clearMessages()
  openModal(role.id ?? null, role)
}

const handleDeleteRole = async (role) => {
  if (!role || !confirm("Вы уверены, что хотите удалить роль?")) {
    return
  }

  isLoading.value = true
  const data = await apiDelete(`admin/roles/${role.id}`)
  isLoading.value = false

  if (data.status === true) {
    roles.value = roles.value.filter((item) => item.id !== role.id)
    showSuccess(`Роль ${role.name} успешно удалена.`)
    return
  }

  showError(data.message ?? "Не удалось удалить роль. Попробуйте позже.")
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
      ? await updateRoleRequest(id, payload)
      : await createRoleRequest(payload)
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
          ? "Не удалось обновить роль. Проверьте данные."
          : "Не удалось создать роль. Проверьте данные.")
    )
  } catch (error) {
    console.error("Ошибка при сохранении роли", error)
    showError(
      error?.response?.data?.message ??
        "Произошла ошибка. Попробуйте повторить позже."
    )
  } finally {
    isSaving.value = false
  }
}

const inputOptions = [
  {
    name: "title",
    placeholder: "Название",
    type: "text",
  },
  {
    name: "created_at",
    placeholder: "Создано",
    type: "date",
  },
  {
    name: "updated_at",
    placeholder: "Редактировано",
    type: "date",
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
        <h1 :class="styles.title">Роли</h1>
        <p :class="styles.subtitle">Управление доступами</p>
      </div>
      <MaterialButton color="success" @click="handleOpenCreateModal">
        Создать роль
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
      <p v-if="!roles.length" class="text-muted">Ничего не найдено.</p>
      <ul v-else class="list-group">
        <li
          class="list-group-item list-group-header d-flex justify-content-between align-items-center"
        >
          <span
            class="list-group-item-label d-flex align-items-center gap-1"
            style="cursor: pointer"
            @click="handleSort('title')"
          >
            Название
            <i
              v-if="getSortIcon('title')"
              class="material-icons"
              style="font-size: 1rem"
              >{{ getSortIcon("title") }}</i
            >
          </span>
          <span
            class="list-group-item-label d-flex align-items-center gap-1"
            style="cursor: pointer"
            @click="handleSort('created_at')"
          >
            Создано
            <i
              v-if="getSortIcon('created_at')"
              class="material-icons"
              style="font-size: 1rem"
              >{{ getSortIcon("created_at") }}</i
            >
          </span>
          <span
            class="list-group-item-label d-flex align-items-center gap-1"
            style="cursor: pointer"
            @click="handleSort('updated_at')"
          >
            Обновлено
            <i
              v-if="getSortIcon('updated_at')"
              class="material-icons"
              style="font-size: 1rem"
              >{{ getSortIcon("updated_at") }}</i
            >
          </span>
          <span class="list-group-item-label manage"></span>
        </li>
        <li
          v-for="role in roles"
          :key="role.id ?? role.alias"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <div
            class="d-flex flex-row justify-content-around w-100 gap-2 align-items-center"
          >
            <span class="list-item">{{ role.title ?? "Без названия" }}</span>
            <span class="list-item">{{ role.created_at ?? "-" }}</span>
            <span class="list-item">{{ role.updated_at ?? "-" }}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <MaterialButton
              color="info"
              variant="outline"
              size="sm"
              class="d-inline-flex align-items-center gap-1"
              @click="handleEditRole(role)"
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
              @click="handleDeleteRole(role)"
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
    <CreateRoleModal
      :is-open="isCreateModalVisible"
      :is-saving="isSaving"
      :role-id="editingRoleId"
      :initial-data="editingRoleSnapshot"
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
