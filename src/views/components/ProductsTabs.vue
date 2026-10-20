<script setup>
import AppList from "@/components/AppList.vue"
import { apiDelete } from "@/api"
import { computed, onMounted, ref, useCssModule, watch } from "vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import Filter from "@/views/components/Filter.vue"
import { fetchCategories, fetchProducts } from "@/services/productsService"
import { fetchAllStores } from "@/services/storesService"
import { productCategoryTitle, productStoreTitle } from "./productListLabels"
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
const stores = ref([])
const storesError = ref("")
const loadStores = async () => {
  try {
    stores.value = await fetchAllStores()
    storesError.value = ""
  } catch (error) {
    storesError.value = "Не удалось загрузить названия складов."
  }
}
const priceLabel = (value) => value == null ? "—" : new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)
const quantityLabel = (product) => product.unlimited === true || Number(product.unlimited) === 1
  ? "Безлимит"
  : product.quantity == null ? "—" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(Number(product.quantity) || 0)

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
    loadStores(),
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

  try {
    isLoading.value = true
    const data = await apiDelete(`admin/products/${product.id}`)
    if (data.status === true) {
      const nextPage = products.value.length === 1 && currentPage.value > 1 ? currentPage.value - 1 : currentPage.value
      await getList(nextPage, pageSize.value)
      showSuccess(`Товар ${product.title} успешно удален.`)
      return
    }
    showError(data.message ?? "Не удалось удалить позицию. Попробуйте позже.")
  } catch (error) {
    showError(error?.response?.data?.message ?? "Не удалось удалить позицию.")
  } finally {
    isLoading.value = false
  }
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
const listColumns = [
  { key: "title", label: "Название", sortable: true, fallback: "Не указано" },
  { key: "category", label: "Категория", format: (item) => productCategoryTitle(item, categories.value) },
  { key: "price", label: "Цена", format: (item) => priceLabel(item.price) },
  { key: "quantity", label: "Количество", format: quantityLabel },
  { key: "store", label: "Склад", format: (item) => productStoreTitle(item, stores.value) },
]
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
    <p v-if="storesError" class="text-warning">{{ storesError }}</p>

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
      <p v-if="!products.length" class="text-muted">
        Список пуст. Добавьте товар или загрузите с сайта.
      </p>
      <AppList v-else :items="products" :columns="listColumns" :get-sort-icon="getSortIcon"
        @sort="handleSort" @edit="emit('edit-product', $event)" @delete="handleDeleteProduct" />
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
.paginationWrapper {
  margin: 15px 0;
}
</style>
