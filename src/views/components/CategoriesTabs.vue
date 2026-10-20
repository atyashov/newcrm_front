<script setup>
import AppList from "@/components/AppList.vue"
import { apiDelete } from "@/api"
import { computed, onMounted, ref, useCssModule, watch } from "vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import Filter from "@/views/components/Filter.vue"
import { fetchCategories } from "@/services/productsService"
import { useSorting } from "@/views/components/useSorting"
import { useFiltering } from "@/views/components/useFiltering"
import { usePagination } from "@/views/components/usePagination"
import { useDataList } from "@/views/components/useDataList"
import { buildQueryParams } from "@/views/components/buildQueryParams"
import store from "@/store"

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

const emit = defineEmits(["edit-category"])

const styles = useCssModule()
const hasLoaded = ref(false)
const categoryTitle = ref("")

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
  items: categories,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchCategories)

const inputOptions = [
  {
    name: "title",
    placeholder: "Название категории",
    type: "text",
  },
]

const subdivision = computed(() => store.state.subdivisions.currentId)

const categoryTitleMap = computed(() => {
  const map = new Map()

  categories.value.forEach((category) => {
    if (category?.id !== null && category?.id !== undefined) {
      map.set(String(category.id), category.title ?? "Не указано")
    }
  })

  return map
})

const resolveParentTitle = (category) => {
  const directParentTitle =
    category?.parent_title ??
    category?.parent_name ??
    category?.parent?.title ??
    null

  if (directParentTitle) {
    return directParentTitle
  }

  const parentId = category?.parent_id ?? category?.parent ?? null

  if (parentId === null || parentId === undefined || parentId === "") {
    return "Без родителя"
  }

  return categoryTitleMap.value.get(String(parentId)) ?? `ID: ${parentId}`
}

const getList = async (page = 1, perPage = pageSize.value) => {
  if (!props.subdivisionId) {
    categories.value = []
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

const refresh = async () => {
  await getList(currentPage.value, pageSize.value)
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

const handleDeleteCategory = async (category) => {
  if (!category || !confirm("Вы уверены, что хотите удалить категорию?")) {
    return
  }

  isLoading.value = true
  const data = await apiDelete(`admin/categories/${category.id}`, {
    params: { subdivision_id: subdivision.value },
  })
  isLoading.value = false

  if (data.status === true) {
    categories.value = categories.value.filter(
      (item) => item.id !== category.id,
    )
    showSuccess(`Категория ${category.title} успешно удалена.`)
    return
  }

  showError(data.message ?? "Не удалось удалить категорию. Попробуйте позже.")
}

const handleFilterChange = async (input) => {
  updateFilters(input)
  categoryTitle.value = input?.title ?? ""
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
    clearFilters()
    resetToFirstPage()
    categoryTitle.value = ""
    hasLoaded.value = false

    if (!props.isActive || !newSubdivision) {
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
})
const listColumns = [
  { key: "title", label: "Название", sortable: true },
  { key: "parent", label: "Родительская категория", format: resolveParentTitle },
]
</script>

<template>
  <div>
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
      <p v-if="!categories.length" class="text-muted">
        Список категорий пуст. Добавьте первую категорию.
      </p>
      <AppList v-else :items="categories" :columns="listColumns" :get-sort-icon="getSortIcon"
        @sort="handleSort" @edit="emit('edit-category', $event)" @delete="handleDeleteCategory" />
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
