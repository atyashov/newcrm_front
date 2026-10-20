<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue"
import { useRouter } from "vue-router"
import Multiselect from "@vueform/multiselect"
import AppList from "./AppList.vue"
import MaterialInput from "./MaterialInput.vue"
import MaterialSelect from "./MaterialSelect.vue"
import MaterialButton from "./MaterialButton.vue"
import MaterialPagination from "./MaterialPagination.vue"
import TableSummary from "./TableSummary.vue"
import OutlayStoreBadges from "./OutlayStoreBadges.vue"
import OutlayQuickEdit from "./OutlayQuickEdit.vue"
import OutlayPageLinks from "./OutlayPageLinks.vue"
import { fetchOutlayTab, serverMessage } from "@/services/outlayTabsService"
import { tabParams, displayDateTime, displayMoney, staffLabel, operationTypes, assignmentGroups } from "@/views/components/outlayTabs"

const props = defineProps({ kind: String, title: String, subdivisionId: [Number, String], from: String, to: String, selfService: Boolean,
  references: { type: Object, required: true }, refreshKey: Number, scope: { type: String, default: "work" } })
const emit = defineEmits(["changed"])
const router = useRouter()
const financial = computed(() => ["receipts", "operations"].includes(props.kind))
const inputId = computed(() => `${props.scope}-${props.kind}`)
const filters = reactive({})
const applied = ref({})
const rows = ref([]), pagination = ref({ per_page: 20 }), totals = ref({})
const pageSize = ref(20), page = ref(1), sort = ref("")
const loading = ref(false), error = ref("")
const editing = ref(null), section = ref("status")
let request = 0
onBeforeUnmount(() => { request++ })
const load = async (nextPage = 1) => {
  const revision = ++request
  page.value = nextPage
  loading.value = true
  error.value = ""
  try {
    const result = await fetchOutlayTab(props.kind, tabParams({ kind: props.kind, filters: applied.value,
      subdivisionId: props.subdivisionId, from: props.from, to: props.to, selfService: props.selfService,
      page: nextPage, pageSize: pageSize.value, sort: sort.value }))
    if (revision !== request) return
    rows.value = result.items
    pagination.value = result.pagination
    totals.value = result.totals
  } catch (e) { if (revision === request) { error.value = serverMessage(e); rows.value = []; totals.value = {}; pagination.value = { per_page: pageSize.value, total: 0 } } }
  finally { if (revision === request) loading.value = false }
}
watch(() => [props.kind, props.subdivisionId, props.from, props.to, props.selfService], () => {
  editing.value = null
  load(1)
}, { immediate: true })
watch(() => props.refreshKey, () => load(page.value))
const apply = () => { applied.value = JSON.parse(JSON.stringify(filters)); load(1) }
const reset = () => { Object.keys(filters).forEach(key => { delete filters[key] }); applied.value = {}; load(1) }
const resize = size => { pageSize.value = Number(size); load(1) }
const sortBy = field => { sort.value = sort.value === field ? `-${field}` : field; load(1) }
const sortIcon = field => sort.value.replace(/^-/, "") === field ? (sort.value.startsWith("-") ? "arrow_downward" : "arrow_upward") : ""
const openQuick = (item, part) => { editing.value = item; section.value = part }
const saved = () => { editing.value = null; emit("changed") }
const openOutlay = item => {
  if (!props.subdivisionId) return
  router.push(`/outlays/${financial.value ? item.outlay_id ?? item.id : item.id}/edit`)
}
const displayType = row => operationTypes.find(type => type.value === row.type)?.label || row.type
const columns = computed(() => financial.value ? [
  { key: "occurred_at", label: "Дата", sortable: true, format: item => displayDateTime(item.occurred_at) },
  { key: "type", label: "Тип", sortable: props.kind === "operations", format: displayType },
  { key: "amount", label: "Сумма", sortable: true, format: item => displayMoney(item.signed_amount ?? item.amount) },
  { key: "cash", label: "Касса", format: item => item.cash_box?.title || "—" },
  { key: "method", label: "Способ оплаты", format: item => item.payment_method?.title || "—" },
  { key: "source", label: "Документ", format: item => item.source_title || item.outlay_title || "—" },
  { key: "execution_date", label: "Дата заказа", sortable: true, format: item => displayDateTime(item.execution_date) },
  { key: "actions", label: "Действия" },
] : [
  { key: props.kind === "orders" ? "execution_date" : "return_date", label: "Дата и время", sortable: true, format: item => displayDateTime(item[props.kind === "orders" ? "execution_date" : "return_date"]) },
  { key: "comment", label: "Примечание ко времени", format: item => item[props.kind === "orders" ? "date_comment" : "return_date_comment"] || "—" },
  { key: "id", label: "№", sortable: true },
  { key: "title", label: "Название", sortable: true },
  { key: "staff", label: props.kind === "orders" ? "Исполнители / сборщики" : "Исполнители / приёмщики" },
  { key: "address", label: "Адрес" },
  { key: "status_id", label: "Статус", sortable: true },
  { key: "stores", label: "Склады" },
  { key: "actions", label: "Действия" },
])
</script>
<template>
  <section class="outlay-work-table" :aria-busy="loading">
    <h3>{{ title }}</h3>
    <form class="outlay-tab-filters" @submit.prevent="apply">
      <MaterialInput :id="inputId + '-id'" v-model:value="filters[financial ? 'outlay_id' : 'id']" label="ID сметы" />
      <MaterialInput :id="inputId + '-title'" v-model:value="filters[financial ? (kind === 'operations' ? 'source_title' : 'outlay_title') : 'title']" :label="financial ? 'Название документа' : 'Название'" />
      <template v-if="financial">
        <MaterialSelect :id="inputId + '-type'" v-model="filters.type" label="Тип" placeholder="Все" :options="kind === 'receipts' ? operationTypes.slice(0, 2) : operationTypes" />
        <MaterialSelect :id="inputId + '-cash'" v-model="filters.cash_box_id" label="Касса" placeholder="Все" :options="references.cashBoxes" />
        <MaterialSelect v-if="kind === 'operations'" :id="inputId + '-direction'" v-model="filters.direction" label="Направление" placeholder="Все" :options="[{value:'income',label:'Приход'}, {value:'expense',label:'Расход'}]" />
      </template>
      <template v-else>
        <MaterialInput :id="inputId + '-address'" v-model:value="filters.address" label="Адрес" />
        <MaterialInput :id="inputId + '-comment'" v-model:value="filters[kind === 'orders' ? 'date_comment' : 'return_date_comment']" label="Примечание ко времени" />
        <div><label :for="inputId + '-statuses'">Статусы</label><Multiselect :id="inputId + '-statuses'" v-model="filters.status_ids" mode="tags" searchable :options="references.statuses" :close-on-select="false" placeholder="Все статусы" /></div>
        <div><label :for="inputId + '-stores'">Склады</label><Multiselect :id="inputId + '-stores'" v-model="filters.store_ids" mode="tags" searchable :options="references.stores" :close-on-select="false" placeholder="Все склады" /></div>
        <div v-for="group in assignmentGroups.filter(group => kind === 'orders' ? ['performer_ids','assembler_ids'].includes(group.field) : ['return_performer_ids','acceptor_ids'].includes(group.field))" :key="group.field">
          <label :for="inputId + '-' + group.field">{{ group.label }}</label><Multiselect :id="inputId + '-' + group.field" v-model="filters[group.field]" mode="tags" searchable :options="references.users" :close-on-select="false" placeholder="Все сотрудники" />
        </div>
      </template>
      <div class="outlay-tab-filter-actions"><MaterialButton type="submit" :disabled="loading">Найти</MaterialButton><MaterialButton type="button" variant="outline" color="secondary" :disabled="loading" @click="reset">Сбросить</MaterialButton></div>
    </form>
    <p v-if="error" class="text-danger" role="alert">{{ error }} <button type="button" class="btn btn-link p-0" @click="load(page)">Повторить</button></p>
    <p v-if="loading" role="status">Загрузка...</p>
    <template v-else-if="!error">
      <TableSummary :pagination="pagination" class="mb-2" />
      <p v-if="kind === 'receipts'">Сумма поступлений: <strong>{{ displayMoney(totals.amount) }}</strong></p>
      <p v-if="kind === 'operations'">Приход: <strong>{{ displayMoney(totals.income) }}</strong> · Расход: <strong>{{ displayMoney(totals.expense) }}</strong> · Итого: <strong>{{ displayMoney(totals.net) }}</strong></p>
      <AppList v-if="rows.length" :items="rows" :columns="columns" :edit="false" :remove="false" :get-sort-icon="sortIcon" @sort="sortBy">
        <template #cell-staff="{item}"><button type="button" class="outlay-quick-link" title="Назначить сотрудников" @click="openQuick(item, 'assignments')"><span>{{ staffLabel(kind === 'orders' ? item.performers : item.return_performers) }}</span><span>{{ staffLabel(kind === 'orders' ? item.assemblers : item.acceptors) }}</span></button></template>
        <template #cell-status_id="{item}"><button type="button" class="outlay-quick-link" title="Изменить статус" @click="openQuick(item, 'status')">{{ item.status?.title || references.statuses.find(status => Number(status.value) === Number(item.status_id))?.label || 'Не указан' }}</button></template>
        <template #cell-stores="{item}"><OutlayStoreBadges :stores="item.stores || []" /></template>
        <template #cell-actions="{item}"><div v-if="!financial || item.outlay_id" class="app-list-actions"><OutlayPageLinks :item="item" /><MaterialButton v-if="subdivisionId" color="info" size="sm" variant="outline" title="Редактировать смету" aria-label="Редактировать смету" @click="openOutlay(item)"><i class="material-icons">edit</i></MaterialButton><a v-if="!financial && item.recipient_phone" :href="'tel:' + item.recipient_phone" class="btn btn-outline-info btn-sm" title="Позвонить получателю" aria-label="Позвонить получателю"><i class="material-icons">phone</i></a></div></template>
      </AppList>
      <p v-else class="text-muted">Записи не найдены.</p>
      <MaterialPagination class="mt-3" :pagination="pagination" :page-size-options="[20,50,100]" @change="load" @pageSizeChange="resize" />
    </template>
    <OutlayQuickEdit v-if="editing" :key="editing.id + section" :item="editing" :section="section" @close="editing = null" @saved="saved" />
  </section>
</template>
<style scoped lang="scss">
.outlay-work-table { margin-top: 1rem; }
h3 { font-size: 1.125rem; }
.outlay-tab-filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; align-items: end; margin-bottom: 1rem; }
.outlay-tab-filters label { font-size: .75rem; margin-bottom: .25rem; }
.outlay-tab-filter-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.outlay-quick-link { display: flex; flex-direction: column; align-items: flex-start; padding: 0; border: 0; color: inherit; background: transparent; font: inherit; text-align: left; text-decoration: underline dotted; text-underline-offset: 3px; }
.outlay-work-table :deep(.app-list-table) { min-width: 64rem; font-size: .75rem; }
@media(max-width: 991px) { .outlay-tab-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media(max-width: 575px) { .outlay-tab-filters { grid-template-columns: 1fr; } }
</style>
