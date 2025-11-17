<script setup>
import { apiGet, apiDelete } from "@/api"
import { computed, onMounted, ref, useCssModule } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import CreateIndividualModal from "@/components/CreateIndividualModal.vue"
import Filter from "@/views/components/Filter.vue"
import {
  fetchIndividuals,
  createIndividual as createIndividualRequest,
  updateIndividual as updateIndividualRequest,
} from "@/services/individualsService"

const styles = useCssModule()

const individuals = ref([])
const isCreateModalVisible = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)
const requestError = ref("")
const requestSuccess = ref("")
const editingClientId = ref(null)
const editingClientSnapshot = ref(null)
const pageSize = ref(10)

const paginationMeta = ref({
  current_page: 1,
  last_page: 1,
  per_page: pageSize.value,
  total: 0,
  prev_page_url: null,
  next_page_url: null,
  links: [],
})

const currentPage = computed(
  () => Number(paginationMeta.value.current_page ?? 1) || 1
)

const totalPages = computed(() => {
  const meta = paginationMeta.value
  if (meta.last_page !== undefined) {
    const numeric = Number(meta.last_page)
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric
    }
  }

  if (meta.total && meta.per_page) {
    const total = Number(meta.total)
    const perPage = Number(meta.per_page)
    if (Number.isFinite(total) && Number.isFinite(perPage) && perPage > 0) {
      return Math.max(1, Math.ceil(total / perPage))
    }
  }

  return 1
})

const getList = async (page = 1, perPage = pageSize.value) => {
  try {
    isLoading.value = true
    requestError.value = ""
    const { data, pagination } = await fetchIndividuals({
      page,
      page_size: perPage,
    })

    individuals.value = Array.isArray(data) ? data : []

    paginationMeta.value = {
      current_page:
        Number(pagination?.current_page ?? page) > 0
          ? Number(pagination?.current_page ?? page)
          : page,
      last_page: Number(pagination?.last_page ?? pagination?.total_pages) || 1,
      per_page: Number(pagination?.per_page ?? perPage) || perPage,
      total: Number(pagination?.total ?? individuals.value.length) || 0,
      prev_page_url: pagination?.prev_page_url ?? null,
      next_page_url: pagination?.next_page_url ?? null,
      links: Array.isArray(pagination?.links) ? pagination.links : [],
    }
  } catch (error) {
    console.error("Не удалось получить список клиентов", error)
    requestError.value =
      "Не удалось загрузить список клиентов. Попробуйте позже."
  } finally {
    isLoading.value = false
  }
}

const goToPage = async (page) => {
  if (
    page < 1 ||
    page > totalPages.value ||
    page === currentPage.value ||
    isLoading.value
  ) {
    return
  }

  await getList(page, pageSize.value)
}

const handlePageSizeChange = async (newSize) => {
  const nextSize = Number(newSize)

  if (!Number.isFinite(nextSize) || nextSize <= 0) {
    return
  }

  pageSize.value = nextSize
  await getList(1, nextSize)
}

const handleOpenCreateModal = () => {
  requestError.value = ""
  editingClientId.value = null
  editingClientSnapshot.value = null
  isCreateModalVisible.value = true
}

const handleEditClient = (client) => {
  if (!client) {
    return
  }

  requestError.value = ""
  editingClientId.value = client.id ?? null
  editingClientSnapshot.value = client ? { ...client } : null
  isCreateModalVisible.value = true
}

const handleDeleteClient = async (client) => {
  if (!client || !confirm("Вы уверены, что хотите удалить клиента?")) {
    return
  }
  isLoading.value = true
  const data = await apiDelete(`admin/individuals/${client.id}`)
  if (data.status === true) {
    individuals.value = individuals.value.filter(
      (item) => item.id !== client.id
    )
    isLoading.value = false
    requestSuccess.value = `Клиент ${client.name} успешно удален.`
    setTimeout(() => {
      requestSuccess.value = ""
    }, 3000)
    return
  }
  requestError.value =
    data.message ?? "Не удалось удалить клиента. Попробуйте позже."
  isLoading.value = false
}

const handleCloseModal = () => {
  isCreateModalVisible.value = false
  editingClientId.value = null
  editingClientSnapshot.value = null
}

const handleModalSubmit = async ({ mode, payload, id }) => {
  if (isSaving.value) {
    return
  }

  try {
    isSaving.value = true
    requestError.value = ""

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

    requestError.value =
      response?.message ??
      (isEditMode
        ? "Не удалось обновить клиента. Проверьте данные."
        : "Не удалось создать клиента. Проверьте данные.")
  } catch (error) {
    console.error("Ошибка при сохранении клиента", error)
    requestError.value =
      error?.response?.data?.message ??
      "Произошла ошибка. Попробуйте повторить позже."
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
  const params = new URLSearchParams()
  Object.entries(input).forEach(([key, value]) => {
    if (value) {
      params.append(key, value)
    }
  })
  console.log(params.toString())
  isLoading.value = true

  try {
    // Фильтрация по нескольким полям, включая пагинацию
    const response = await apiGet(`admin/individuals?${params.toString()}`)
    individuals.value = Array.isArray(response.data.items.data)
      ? response.data.items.data
      : []
    paginationMeta.value = {
      current_page: response.data.items.current_page,
      last_page: response.data.items.last_page,
      per_page: response.data.items.per_page,
      total: response.data.items.total,
    }
  } catch (error) {
    console.error("Ошибка при фильтрации клиентов", error)
    requestError.value =
      error?.response?.data?.message ??
      "Произошла ошибка. Измените параметры фильтра."
  } finally {
    isLoading.value = false
  }
}

onMounted(() => getList(currentPage.value, pageSize.value))
</script>

<template>
  <section :class="styles.wrapper">
    <header :class="styles.header">
      <div>
        <h1 :class="styles.title">Физические лица</h1>
        <p :class="styles.subtitle">Управление клиентами</p>
      </div>
      <MaterialButton color="success" @click="handleOpenCreateModal">
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
      <p v-if="!individuals.length" class="text-muted">
        Список пуст. Добавьте первого клиента.
      </p>
      <ul v-else class="list-group">
        <li
          v-for="client in individuals"
          :key="client.id ?? client.email ?? client.name"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <div class="d-flex flex-column">
            <p class="mb-1 fw-bold">{{ client.name ?? "Без имени" }}</p>
            <small class="text-muted">
              {{ client.phone ?? "Телефон не указан" }} •
              {{ client.email ?? "Email не указан" }}
            </small>
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

.buttonIcon {
  font-size: 1.4rem !important;
}

.paginationWrapper {
  margin: 15px 0;
}
</style>
