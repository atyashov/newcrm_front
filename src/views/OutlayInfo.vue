<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OutlaySnapshot from '@/components/OutlaySnapshot.vue'
import OutlayDocuments from '@/components/OutlayDocuments.vue'
import OutlayQuickEdit from '@/components/OutlayQuickEdit.vue'
import MaterialButton from '@/components/MaterialButton.vue'
import { fetchOutlayInfo, rotateOutlayLink } from '@/services/outlayDocumentsService'
import { serverMessage } from '@/services/outlayTabsService'
import { publicOutlayUrl } from '@/utils/outlayDocuments'
import OutlayStaffDetails from '@/components/OutlayStaffDetails.vue'
import OutlayProcessingTable from '@/components/OutlayProcessingTable.vue'
import OutlayWorkText from '@/components/OutlayWorkText.vue'
import { assignmentGroups } from '@/views/components/outlayTabs'
const workNotes = [
  { field: 'additional_upload_comment', label: 'Дополнительно собрано' },
  { field: 'retriever_comment', label: 'Комментарии для забора' },
  { field: 'damage_loss_comment', label: 'Порча / Утеря' },
]
const route = useRoute(), router = useRouter()
const result = ref(null), loading = ref(false), error = ref(''), linkError = ref(''), rotating = ref(false), copied = ref(false), quickSection = ref('')
let request = 0
onBeforeUnmount(() => { request++ })
const item = computed(() => result.value?.item)
const uuid = ref('')
const publicUrl = computed(() => uuid.value ? publicOutlayUrl(uuid.value) : '')
const load = async () => {
  const revision = ++request
  loading.value = true; error.value = ''; result.value = null; uuid.value = ''; copied.value = false; quickSection.value = ''
  try {
    const data = await fetchOutlayInfo(route.params.id)
    if (revision !== request) return
    result.value = data
    uuid.value = data.item.public_uuid || (data.public_api_url || '').split('/').pop() || ''
  } catch (e) { if (revision === request) error.value = serverMessage(e) }
  finally { if (revision === request) loading.value = false }
}
watch(() => route.params.id, load, { immediate: true })
const rotate = async () => {
  if (rotating.value || !window.confirm('Выпустить новую ссылку? Старая ссылка клиента сразу перестанет работать.')) return
  const revision = request
  rotating.value = true; linkError.value = ''; copied.value = false
  try { const data = await rotateOutlayLink(item.value.id); if (revision === request) uuid.value = data.public_uuid }
  catch (e) { if (revision === request) linkError.value = serverMessage(e) }
  finally { rotating.value = false }
}
const copy = async () => {
  try { await navigator.clipboard.writeText(publicUrl.value); copied.value = true; linkError.value = '' }
  catch { linkError.value = 'Не удалось скопировать автоматически. Выделите ссылку в поле и скопируйте вручную.' }
}
const applyStages = (updated) => {
  for (const group of item.value?.groups ?? []) {
    const position = group.items?.find(entry => Number(entry.id) === Number(updated.id))
    if (position) { position.stages = updated.stages; break }
  }
}
const applyComments = (updated, field) => {
  for (const group of item.value?.groups ?? []) {
    const position = group.items?.find(entry => Number(entry.id) === Number(updated.id))
    if (position) {
      position.comments = { ...position.comments, [field]: updated.comments[field], editors: { ...position.comments?.editors, [field]: updated.comments.editors?.[field] } }
      break
    }
  }
}
const applyNotes = (updated, field) => {
  item.value.work_notes = { ...item.value.work_notes, [field]: updated.work_notes[field], editors: { ...item.value.work_notes?.editors, [field]: updated.work_notes.editors?.[field] } }
}
const quickSaved = updated => {
  const fields = quickSection.value === 'status' ? ['status_id', 'status'] : assignmentGroups.flatMap(group => [group.field, group.relation])
  for (const field of fields) if (field in updated) item.value[field] = updated[field]
  quickSection.value = ''
}
</script>
<template>
  <section class="outlay-info-page">
    <header class="info-toolbar"><h1>Информация о смете</h1><div><MaterialButton color="secondary" variant="outline" @click="router.push('/dashboard')">К списку</MaterialButton><MaterialButton v-if="item" @click="router.push(`/outlays/${item.id}/edit`)">Редактировать</MaterialButton></div></header>
    <p v-if="loading" role="status">Загрузка...</p>
    <p v-else-if="error" class="text-danger" role="alert">{{ error }} <button type="button" class="btn btn-link" @click="load">Повторить</button></p>
    <template v-else-if="item">
      <p class="text-sm">Статусы товаров сохраняются сразу после изменения галочки и относятся ко всей позиции, а не к отдельным единицам количества.</p>
      <OutlaySnapshot :item="item">
        <template #composition="{groups}"><OutlayProcessingTable :outlay-id="item.id" :groups="groups" @stages="applyStages" @comments="applyComments" /></template>
      </OutlaySnapshot>
      <section class="info-block"><h2>Рабочие заметки</h2><p class="text-sm">Текст сохраняется при выходе из поля. Эти заметки не видны клиенту.</p><div class="work-notes-grid">
        <OutlayWorkText v-for="entry in workNotes" :key="`${item.id}-${entry.field}`" :outlay-id="item.id" :field="entry.field" :label="entry.label" :value="item.work_notes?.[entry.field] || ''" :editor="item.work_notes?.editors?.[entry.field]" @updated="updated => applyNotes(updated, entry.field)" />
      </div></section>
      <section class="info-block"><h2>Внутренняя информация</h2>
        <OutlayStaffDetails :item="item" :counterparty="result.counterparty" />
        <div class="info-buttons"><MaterialButton variant="outline" color="info" @click="quickSection = 'status'">Изменить статус</MaterialButton><MaterialButton variant="outline" color="info" @click="quickSection = 'assignments'">Назначить сотрудников</MaterialButton></div>
      </section>
      <OutlayDocuments :outlay-id="item.id" />
      <section class="info-block"><h2>Ссылка для клиента</h2><p class="text-sm">Любой получивший эту ссылку сможет увидеть смету и контактные данные получателя.</p>
        <input v-if="publicUrl" class="form-control mb-2" :value="publicUrl" aria-label="Ссылка для клиента" readonly @focus="$event.target.select()" />
        <div class="info-buttons"><a v-if="publicUrl" :href="publicUrl" target="_blank" rel="noopener noreferrer" class="btn btn-outline-info mb-0">Открыть просмотр</a><MaterialButton v-if="publicUrl" color="secondary" variant="outline" @click="copy">{{ copied ? 'Скопировано' : 'Скопировать ссылку' }}</MaterialButton><MaterialButton color="warning" variant="outline" :disabled="rotating" @click="rotate">{{ rotating ? 'Выпуск ссылки...' : 'Перевыпустить ссылку' }}</MaterialButton></div>
        <p v-if="linkError" class="text-danger mt-2" role="alert">{{ linkError }}</p>
      </section>
      <OutlayQuickEdit v-if="quickSection" :key="item.id + quickSection" :item="item" :section="quickSection" @close="quickSection = ''" @saved="quickSaved" />
    </template>
  </section>
</template>
<style scoped>
.outlay-info-page { padding: 1.5rem; color: var(--outlay-text); }
.info-toolbar, .info-toolbar > div, .info-buttons { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
.info-toolbar { justify-content: space-between; margin-bottom: 1.5rem; }
.info-toolbar h1 { font-size: 1.5rem; margin: 0; }
.info-block { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--outlay-border); }
h2 { font-size: 1.125rem; }
.work-notes-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
@media(max-width: 991px) { .work-notes-grid { grid-template-columns: 1fr; } }
@media(max-width: 767px) { .outlay-info-page { padding: .75rem; } }
</style>
