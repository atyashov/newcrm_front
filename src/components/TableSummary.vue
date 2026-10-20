<script setup>
import { computed } from "vue"
import { paginationRange } from "@/utils/paginationRange"
const props = defineProps({ pagination: { type: Object, default: () => ({}) } })
const range = computed(() => paginationRange(props.pagination))
</script>

<template>
  <p v-if="range" class="table-record-summary">
    Показаны записи <strong>{{ range.from }}–{{ range.to }}</strong>
    из <strong>{{ range.total }}</strong>
  </p>
</template>

<style scoped>
.table-record-summary { margin: 0; font-size: 0.875rem; color: inherit; }
</style>
