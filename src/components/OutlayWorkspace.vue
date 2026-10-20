<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue"
import MaterialInput from "./MaterialInput.vue"
import MaterialButton from "./MaterialButton.vue"
import MaterialTextarea from "./MaterialTextarea.vue"
import OutlayWorkTable from "./OutlayWorkTable.vue"
import { apiGet } from "@/api"
import { fetchUsers } from "@/services/usersService"
import { fetchStatusesForOutlays } from "@/services/outlaysService"
import { fetchAllStores } from "@/services/storesService"
import { collectDirectoryPages, directoryList } from "@/utils/directoryList"
import { fetchAllOutlayEvents, serverMessage } from "@/services/outlayTabsService"
import { tabParams, scheduleText, localDay, userLabel } from "@/views/components/outlayTabs"

const props = defineProps({ tab: String, subdivisionId: [Number, String], period: Object, refreshKey: Number })
const emit = defineEmits(["changed"])
const dispatch = computed(() => ["distribution", "self"].includes(props.tab))
const dateFrom = ref(props.period.date_start_from || localDay())
const dateTo = ref(props.period.date_start_to || localDay())
const day = ref(localDay())
const from = computed(() => dispatch.value ? day.value : dateFrom.value)
const to = computed(() => dispatch.value ? day.value : dateTo.value)
const references = reactive({ users: [], stores: [], statuses: [], cashBoxes: [] })
const referenceError = ref("")
let referenceRequest = 0
let textRequest = 0
onBeforeUnmount(() => { referenceRequest++; textRequest++ })
const loadReferences = async () => {
  const revision = ++referenceRequest
  referenceError.value = ""
  Object.keys(references).forEach(key => { references[key] = [] })
  const financial = ["receipts", "operations"].includes(props.tab)
  if (props.tab === "text") return
  const tasks = financial ? {
    cashBoxes: () => collectDirectoryPages(async params => {
      const result = await apiGet("admin/cash-boxes", params)
      if (result?.status !== true) throw new Error(serverMessage(result))
      return directoryList(result.data?.items ?? [], params)
    }),
  } : {
    users: () => collectDirectoryPages(fetchUsers, props.subdivisionId ? { subdivision_id: props.subdivisionId, status: "1" } : { status: "1" }),
    statuses: () => fetchStatusesForOutlays(props.subdivisionId ? { subdivision_id: props.subdivisionId } : {}),
    stores: fetchAllStores,
  }
  await Promise.all(Object.entries(tasks).map(async ([key, task]) => {
    try {
      const rows = await task()
      if (revision === referenceRequest) references[key] = rows.map(item => ({ value: Number(item.id), label: key === "users" ? userLabel(item) : item.title }))
    } catch (e) { if (revision === referenceRequest) referenceError.value += `${serverMessage(e)}\n` }
  }))
}
watch(() => props.subdivisionId, loadReferences, { immediate: true })
watch(() => [props.period.date_start_from, props.period.date_start_to], ([start, end]) => {
  dateFrom.value = start || ""
  dateTo.value = end || ""
})
const text = ref(""), textCount = ref(0), textLoading = ref(false), textError = ref(""), copied = ref(false), textGenerated = ref(false)
watch(() => [props.subdivisionId, dateFrom.value, dateTo.value], () => {
  textRequest++; text.value = ""; textCount.value = 0; textError.value = ""; textLoading.value = false; copied.value = false; textGenerated.value = false
})
const loadText = async () => {
  const revision = ++textRequest
  if (!dateFrom.value || !dateTo.value || dateFrom.value > dateTo.value) { textError.value = "Укажите корректный период."; return }
  textLoading.value = true; textError.value = ""; copied.value = false; text.value = ""; textCount.value = 0
  try {
    const events = await Promise.all(["orders", "returns"].map(kind => fetchAllOutlayEvents(kind,
      tabParams({ kind, subdivisionId: props.subdivisionId, from: dateFrom.value, to: dateTo.value }), () => revision === textRequest)))
    if (revision !== textRequest) return
    text.value = scheduleText(...events)
    textGenerated.value = true
    textCount.value = events[0].length + events[1].length
  } catch (e) { if (revision === textRequest) textError.value = serverMessage(e) }
  finally { if (revision === textRequest) textLoading.value = false }
}
const copy = async () => {
  try { await navigator.clipboard.writeText(text.value); copied.value = true }
  catch { textError.value = "Браузер не разрешил копирование. Выделите текст и скопируйте вручную." }
}
</script>
<template>
  <div class="outlay-workspace">
    <div class="outlay-workspace-period">
      <MaterialInput v-if="dispatch" :id="tab + '-day'" v-model:value="day" type="date" label="Дата распределения" />
      <template v-else>
        <MaterialInput :id="tab + '-from'" v-model:value="dateFrom" type="date" :label="tab === 'returns' ? 'Дата возврата от' : tab === 'text' ? 'Начало периода' : 'Дата операции от'" />
        <MaterialInput :id="tab + '-to'" v-model:value="dateTo" type="date" :label="tab === 'returns' ? 'Дата возврата до' : tab === 'text' ? 'Конец периода' : 'Дата операции до'" />
      </template>
    </div>
    <p v-if="referenceError" class="text-danger" role="alert">{{ referenceError }} <button type="button" class="btn btn-link p-0" @click="loadReferences">Загрузить справочники повторно</button></p>
    <p v-if="from && to && from > to" class="text-danger">Начало периода не может быть позже конца.</p>
    <template v-else-if="tab === 'text'">
      <MaterialButton :disabled="textLoading" @click="loadText">{{ textLoading ? 'Загрузка...' : 'Сформировать текст' }}</MaterialButton>
      <p v-if="textError" class="text-danger mt-2" role="alert">{{ textError }}</p>
      <template v-if="textCount">
        <p class="mt-3">Количество событий: {{ textCount }}</p>
        <MaterialTextarea id="outlay-schedule-text" v-model:value="text" :rows="18" placeholder="Расписание" />
        <MaterialButton class="mt-3" variant="outline" @click="copy">{{ copied ? 'Скопировано' : 'Скопировать' }}</MaterialButton>
      </template>
      <p v-else-if="!textLoading" class="text-muted mt-3">{{ textGenerated ? 'За выбранный период событий нет.' : 'Сформируйте расписание за выбранный период.' }}</p>
    </template>
    <p v-else-if="dispatch && !day" class="text-muted">Выберите дату распределения.</p>
    <template v-else-if="dispatch">
      <OutlayWorkTable kind="orders" :scope="tab" :title="tab === 'self' ? 'Самовывозы' : 'Заказы'" :subdivision-id="subdivisionId" :from="from" :to="to" :self-service="tab === 'self'" :references="references" :refresh-key="refreshKey" @changed="emit('changed')" />
      <OutlayWorkTable kind="returns" :scope="tab" :title="tab === 'self' ? 'Самовозвраты' : 'Возвраты'" :subdivision-id="subdivisionId" :from="from" :to="to" :self-service="tab === 'self'" :references="references" :refresh-key="refreshKey" @changed="emit('changed')" />
    </template>
    <OutlayWorkTable v-else :kind="tab" :scope="tab" :title="{ receipts: 'Поступления', operations: 'Операции', returns: 'Возвраты' }[tab]" :subdivision-id="subdivisionId" :from="from" :to="to" :references="references" :refresh-key="refreshKey" @changed="emit('changed')" />
  </div>
</template>
<style scoped>
.outlay-workspace-period { display: grid; grid-template-columns: repeat(2, minmax(0, 15rem)); gap: .75rem; margin: 1rem 0; }
@media(max-width: 575px) { .outlay-workspace-period { grid-template-columns: 1fr; } }
</style>
