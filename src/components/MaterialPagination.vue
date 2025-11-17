<script setup>
import { computed, useCssModule } from "vue"
import MaterialPaginationItem from "./MaterialPaginationItem.vue"

const props = defineProps({
  pagination: {
    type: Object,
    default: () => ({}),
  },
  color: {
    type: String,
    default: "success",
  },
  size: {
    type: String,
    default: "md",
  },
  hideIfSingle: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(["change", "pageSizeChange"])
const styles = useCssModule()
const pageSizeOptions = [10, 20, 50, 100]

const paginationClasses = computed(() => {
  const colorClass = props.color ? `pagination-${props.color}` : ""
  const sizeClass = props.size ? `pagination-${props.size}` : ""

  return [colorClass, sizeClass].filter(Boolean).join(" ")
})

const currentPage = computed(() => {
  const raw = props.pagination?.current_page
  const numeric = Number(raw)

  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1
})

const totalPages = computed(() => {
  const source = props.pagination ?? {}

  if (source.last_page !== undefined) {
    const numeric = Number(source.last_page)
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric
    }
  }

  if (source.total !== undefined && source.per_page) {
    const total = Number(source.total)
    const perPage = Number(source.per_page)

    if (Number.isFinite(total) && Number.isFinite(perPage) && perPage > 0) {
      return Math.max(1, Math.ceil(total / perPage))
    }
  }

  if (Array.isArray(source.links) && source.links.length) {
    const numericLinks = source.links.filter((link) =>
      /^\d+$/.test(String(link.label))
    )

    if (numericLinks.length) {
      return numericLinks.length
    }
  }

  return 1
})

const disabledPrev = computed(() => currentPage.value <= 1)
const disabledNext = computed(() => currentPage.value >= totalPages.value)

const shouldRender = computed(() => !props.hideIfSingle || totalPages.value > 1)

const visibleItems = computed(() => {
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => ({
      type: "page",
      value: index + 1,
      key: index + 1,
    }))
  }

  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b)

  const items = []

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index]
    items.push({ type: "page", value: page, key: page })

    const next = sorted[index + 1]
    if (next === undefined) {
      continue
    }

    const gap = next - page

    if (gap === 2) {
      items.push({ type: "page", value: page + 1, key: page + 1 })
    } else if (gap > 2) {
      items.push({ type: "ellipsis", key: `ellipsis-${page}` })
    }
  }

  return items
})

const handleChange = (page) => {
  if (
    page < 1 ||
    page > totalPages.value ||
    page === currentPage.value ||
    props.pagination?.disabled
  ) {
    return
  }

  emit("change", page)
}

const handleItemClick = (item) => {
  if (item.type !== "page" || item.value === undefined) {
    return
  }

  handleChange(item.value)
}

const handlePageSizeChange = ({ target }) => {
  if (!target) {
    return
  }

  const pageSize = Number(target.value)
  emit("pageSizeChange", pageSize)
}
</script>

<template>
  <div :class="styles.container">
    <ul v-if="shouldRender" class="pagination" :class="paginationClasses">
      <MaterialPaginationItem
        prev
        :disabled="disabledPrev"
        @click="handleChange(currentPage - 1)"
      />
      <MaterialPaginationItem
        v-for="item in visibleItems"
        :key="item.key"
        :label="item.type === 'ellipsis' ? '…' : String(item.value)"
        :disabled="item.type === 'ellipsis'"
        :active="item.type === 'page' && item.value === currentPage"
        @click="handleItemClick(item)"
      />
      <MaterialPaginationItem
        next
        :disabled="disabledNext"
        @click="handleChange(currentPage + 1)"
      />
    </ul>
    <select
      class="form-select"
      :class="styles.pageSize"
      :value="props.pagination?.per_page ?? pageSizeOptions[0]"
      @change="handlePageSizeChange"
    >
      <option v-for="option in pageSizeOptions" :key="option" :value="option">
        {{ option }}
      </option>
    </select>
  </div>
</template>

<style module lang="scss">
.container {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.paginationClasses {
  width: fit-content !important;
}

.pageSize {
  width: 60px !important;
  flex: 0 0 auto;
  padding-right: 1.75rem;
}
</style>
