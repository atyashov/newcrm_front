<script setup>
import { apiDelete } from "@/api"
import { computed, onMounted, ref, useCssModule, watch } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
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
      <p v-if="!categories.length" class="text-muted">
        Список категорий пуст. Добавьте первую категорию.
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
          <span class="list-group-item-label">Родительская категория</span>
          <span class="list-group-item-label manage"></span>
        </li>
        <li
          v-for="category in categories"
          :key="category.id"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <div
            class="d-flex flex-row justify-content-around w-100 gap-2 align-items-center"
          >
            <span class="list-item">{{ category.title ?? "Не указано" }}</span>
            <span class="list-item">{{ resolveParentTitle(category) }}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <MaterialButton
              color="info"
              variant="outline"
              size="sm"
              class="d-inline-flex align-items-center gap-1"
              @click="emit('edit-category', category)"
            >
              <i
                :class="[styles.buttonIcon, 'material-icons']"
                aria-hidden="true"
                >edit
              </i>
            </MaterialButton>
            <MaterialButton
              color="danger"
              variant="outline"
              size="sm"
              class="d-inline-flex align-items-center gap-1"
              @click="handleDeleteCategory(category)"
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
