<script setup>
defineProps({ stores: { type: Array, default: () => [] } })
const stages = [
  { key: "assembled", label: "Сборка", no: "НС", part: "СЧ", yes: "С" },
  { key: "uploaded", label: "Погрузка", no: "НП", part: "ПЧ", yes: "П" },
  { key: "retrieved", label: "Забор", no: "НЗ", part: "ЗЧ", yes: "З" },
  { key: "checked", label: "Проверка", no: "НП", part: "ПЧ", yes: "П" },
]
const state = (stats, key) => !stats?.[key] ? "none" : stats[key] >= stats.total ? "done" : "partial"
</script>
<template>
  <div class="outlay-store-badges">
    <div v-for="store in stores" :key="store.id" class="outlay-store-line">
      <span class="badge bg-primary">{{ store.title }}</span>
      <template v-if="store.stages?.total">
        <span v-for="stage in stages" :key="stage.key" class="badge" :class="'stage-' + state(store.stages, stage.key)" :title="`${stage.label}: ${store.stages[stage.key] || 0} из ${store.stages.total}`">{{ state(store.stages, stage.key) === 'done' ? stage.yes : state(store.stages, stage.key) === 'partial' ? stage.part : stage.no }}</span>
        <span v-if="store.stages.lost" class="badge stage-none" :title="'Утеря: ' + store.stages.lost">Утеря</span>
        <span v-if="store.stages.defective" class="badge stage-none" :title="'Дефект: ' + store.stages.defective">Дефект</span>
      </template>
    </div>
    <span v-if="!stores.length">—</span>
  </div>
</template>
<style scoped lang="scss">
.outlay-store-badges { display: flex; flex-direction: column; gap: 2px; }
.outlay-store-line { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; }
.badge { padding: 3px 4px; font-size: .625rem; }
.stage-none { background: var(--bs-danger, #f44335); color: #fff; }
.stage-partial { background: var(--bs-warning, #fb8c00); color: #111; }
.stage-done { background: var(--bs-success, #4caf50); color: #fff; }
</style>
