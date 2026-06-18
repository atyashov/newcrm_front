<script setup>
import { apiDelete } from "@/api"
import { computed, onMounted, ref, useCssModule, watch } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import Filter from "@/views/components/Filter.vue"
import { fetchCategories, fetchProducts } from "@/services/productsService"
import { useSorting } from "@/views/components/useSorting"
import { useFiltering } from "@/views/components/useFiltering"
import { usePagination } from "@/views/components/usePagination"
import { useDataList } from "@/views/components/useDataList"
import { buildQueryParams } from "@/views/components/buildQueryParams"

const props = defineProps({
  subdivisionId: {
    type: [Number, String, null],
    default: null,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["edit-product"])

const styles = useCssModule()
const hasLoaded = ref(false)

const { toggleSort, getSortIcon, getSortParam } = useSorting()
const { updateFilters, getFilterParams, clearFilters } = useFiltering()
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
  items: products,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchProducts)

const {
  items: categories,
  loadData: loadCategoriesData,
  requestError: categoriesError,
  clearMessages: clearCategoriesMessages,
} = useDataList(fetchCategories)

const categoryOptions = computed(() => categories.value)

const inputOptions = [
  {
    name: "title",
    placeholder: "Название",
    type: "text",
  },
]

const getList = async (page = 1, perPage = pageSize.value) => {
  if (!props.subdivisionId) {
    products.value = []
    return
  }

  const params = buildQueryParams({
    page,
    perPage,
    filters: {
      ...getFilterParams(),
      subdivision_id: props.subdivisionId,
    },
    sort: getSortParam(),
  })

  await loadData(params, (response) => {
    if (response?.pagination) {
      updatePaginationMeta(response.pagination, page, perPage)
    }
  })
}

const getCategoriesList = async () => {
  if (!props.subdivisionId) {
    categories.value = []
    return
  }

  const params = buildQueryParams({
    page: 1,
    perPage: 100,
    filters: {
      subdivision_id: props.subdivisionId,
    },
  })

  await loadCategoriesData(params)
}

const refresh = async () => {
  await Promise.all([
    getList(currentPage.value, pageSize.value),
    getCategoriesList(),
  ])
  hasLoaded.value = true
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

const handleDeleteProduct = async (product) => {
  if (!product || !confirm("Вы уверены, что хотите удалить позицию?")) {
    return
  }

  isLoading.value = true
  const data = await apiDelete(`admin/products/${product.id}`)
  isLoading.value = false

  if (data.status === true) {
    products.value = products.value.filter((item) => item.id !== product.id)
    showSuccess(`Товар ${product.title} успешно удален.`)
    return
  }

  showError(data.message ?? "Не удалось удалить позицию. Попробуйте позже.")
}

const handleFilterChange = async (input) => {
  updateFilters(input)
  resetToFirstPage()
  await getList(1, pageSize.value)
}

const handleSort = async (field) => {
  toggleSort(field)
  await getList(currentPage.value, pageSize.value)
}

watch(
  () => props.isActive,
  async (isActive) => {
    if (!isActive || hasLoaded.value || !props.subdivisionId) {
      return
    }

    await refresh()
  },
)

watch(
  () => props.subdivisionId,
  async (newSubdivision, oldSubdivision) => {
    if (newSubdivision === oldSubdivision) {
      return
    }

    clearMessages()
    clearCategoriesMessages()
    clearFilters()
    resetToFirstPage()
    hasLoaded.value = false

    if (!props.isActive || !newSubdivision) {
      products.value = []
      categories.value = []
      return
    }

    await refresh()
  },
)

onMounted(async () => {
  if (!props.isActive || !props.subdivisionId) {
    return
  }

  await refresh()
})

defineExpose({
  refresh,
  categoryOptions,
})
</script>

<template>
  <div>
    <Filter :input-options="inputOptions" @change="handleFilterChange" />

    <div v-if="requestError" class="alert alert-danger" role="alert">
      {{ requestError }}
    </div>

    <div v-if="categoriesError" class="alert alert-warning" role="alert">
      {{ categoriesError }}
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
      <p v-if="!products.length" class="text-muted">
        Список пуст. Добавьте товар или загрузите с сайта.
      </p>
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
          <span class="list-group-item-label manage"></span>
        </li>
        <li
          v-for="product in products"
          :key="product.id"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <div
            class="d-flex flex-row justify-content-around w-100 gap-2 align-items-center"
          >
            <span class="list-item">{{ product.title ?? "Не указано" }}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <MaterialButton
              color="info"
              variant="outline"
              size="sm"
              class="d-inline-flex align-items-center gap-1"
              @click="emit('edit-product', product)"
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
              @click="handleDeleteProduct(product)"
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
  </div>
</template>

<style module lang="scss">
.buttonIcon {
  font-size: 1.4rem !important;
}

.paginationWrapper {
  margin: 15px 0;
}
</style>
