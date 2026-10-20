<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import AppList from './AppList.vue'
import MaterialSelect from './MaterialSelect.vue'
import MaterialPagination from './MaterialPagination.vue'
import TableSummary from './TableSummary.vue'
import { fetchOutlayAudit } from '@/services/outlayAuditService'
import { serverMessage } from '@/services/outlayTabsService'
import { auditEvents, auditUser, auditDescription } from '@/views/components/outlayAudit'
import { displayDateTime } from '@/views/components/outlayTabs'
const props = defineProps({ outlayId: { type: [String, Number], required: true } })
const loading = ref(false), error = ref(''), summary = ref(null), items = ref([]), pagination = ref({per_page:20})
const event = ref('status_changed'), pageSize = ref(20), page = ref(1)
let revision = 0
onBeforeUnmount(() => { revision++ })
const summaryFields = [
  {key:'created',label:'Создание сметы'},
  {key:'last_edited',label:'Последнее редактирование'},
  {key:'creator_changed',label:'Последнее изменение создателя'},
]
const columns = [
  {key:'user',label:'Пользователь',format:auditUser},
  {key:'event',label:'Действие',format:row=>auditEvents.find(event=>event.value===row.event)?.label || row.event},
  {key:'details',label:'Изменение',format:auditDescription},
  {key:'at',label:'Время изменения',format:row=>displayDateTime(row.at)},
]
const load = async (next = 1) => {
  const current = ++revision
  page.value = next; loading.value = true; error.value = ''
  try {
    const data = await fetchOutlayAudit(props.outlayId, {page:next,page_size:pageSize.value,...(event.value?{event:event.value}:{})})
    if (current !== revision) return
    summary.value = data.summary; items.value = data.items.data; pagination.value = data.items
  } catch (e) { if (current === revision) {error.value=serverMessage(e);items.value=[]} }
  finally {if(current===revision)loading.value=false}
}
watch(()=>props.outlayId,()=>{summary.value=null;load(1)},{immediate:true})
watch(event,()=>load(1))
const resize=size=>{pageSize.value=Number(size);load(1)}
</script>
<template>
  <section class="outlay-audit">
    <h2>Журнал изменений</h2>
    <div v-if="summary" class="audit-summary-scroll"><table class="audit-summary"><tbody>
      <tr v-for="entry in summaryFields" :key="entry.key"><th scope="row">{{ entry.label }}</th><td>{{ summary[entry.key] ? auditUser(summary[entry.key]) : 'Нет данных' }}</td><td>{{ displayDateTime(summary[entry.key]?.at) }}</td></tr>
    </tbody></table></div>
    <div class="audit-filter"><MaterialSelect :id="'audit-event-' + outlayId" v-model="event" label="История действий" placeholder="Все действия" :options="auditEvents" :disabled="loading" /></div>
    <p v-if="loading" role="status">Загрузка журнала...</p>
    <p v-else-if="error" class="text-danger" role="alert">{{ error }} <button type="button" class="btn btn-link p-0" @click="load(page)">Повторить</button></p>
    <template v-else>
      <TableSummary :pagination="pagination" class="mb-2" />
      <AppList v-if="items.length" :items="items" :columns="columns" :edit="false" :remove="false" />
      <p v-else class="text-muted">Событий нет. Для старых смет история могла не сохраняться.</p>
      <MaterialPagination :pagination="pagination" :page-size-options="[20,50,100]" class="mt-2" @change="load" @pageSizeChange="resize" />
    </template>
  </section>
</template>
<style scoped>
.outlay-audit { margin-top: 1.5rem; color: var(--outlay-text); }
h2 { font-size: 1.125rem; }
.audit-summary-scroll { overflow-x: auto; }
.audit-summary { width: 100%; font-size: .8125rem; border-collapse: collapse; }
.audit-summary th, .audit-summary td { padding: .35rem .5rem; border-bottom: 1px solid var(--outlay-border); color: inherit; }
.audit-summary th { font-weight: 600; }
.audit-filter { max-width: 20rem; margin: 1rem 0; }
</style>
