<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { updateOutlayText, serverMessage } from '@/services/outlayTabsService'
import { displayDateTime, userLabel } from '@/views/components/outlayTabs'
const props = defineProps({ outlayId: { type: [String, Number], required: true }, itemId: { type: [String, Number], default: null },
  field: { type: String, required: true }, label: { type: String, required: true }, value: { type: String, default: '' }, editor: { type: Object, default: null } })
const emit = defineEmits(['updated'])
const draft = ref(props.value || ''), saving = ref(false), error = ref(''), saved = ref(false)
const dirty = computed(() => draft.value !== (props.value || ''))
const id = computed(() => `outlay-${props.outlayId}-${props.itemId ?? 'notes'}-${props.field}`)
let revision = 0
onBeforeUnmount(() => { revision++ })
watch(() => [props.outlayId, props.itemId, props.field], () => {
  revision++; draft.value = props.value || ''; saving.value = false; error.value = ''; saved.value = false
})
watch(() => props.value, (value, previous) => { if (draft.value === (previous || '')) draft.value = value || '' })
const edit = value => { draft.value = value; saved.value = false; error.value = '' }
const save = async () => {
  if (saving.value || !dirty.value) return
  if (Array.from(draft.value).length > 10000) { error.value = 'Не более 10000 символов.'; return }
  const current = revision
  saving.value = true; error.value = ''; saved.value = false
  try {
    const result = await updateOutlayText(props.outlayId, props.itemId, props.field, draft.value || null)
    if (current !== revision) return
    const record = props.itemId != null ? result.comments : result.work_notes
    draft.value = record[props.field] || ''
    emit('updated', result)
    saved.value = true
  } catch (e) { if (current === revision) error.value = serverMessage(e) }
  finally { if (current === revision) saving.value = false }
}
</script>
<template>
  <div class="outlay-work-text" :aria-busy="saving">
    <label :for="id">{{ label }}</label>
    <div class="input-group input-group-outline is-filled"><textarea :id="id" class="form-control" :value="draft" :disabled="saving" :aria-invalid="Boolean(error)" rows="2" maxlength="10000" @input="edit($event.target.value)" @blur="save"></textarea></div>
    <p v-if="editor?.updated_at" class="work-text-meta">{{ editor.user ? userLabel(editor.user) : 'Пользователь не указан' }} · {{ displayDateTime(editor.updated_at) }}</p>
    <p v-if="error" class="text-danger work-text-message" role="alert">{{ error }} Текст оставлен в поле. Повторите сохранение.</p>
    <p v-else-if="saving" class="work-text-message" role="status">Сохранение...</p>
    <p v-else-if="saved" class="text-success work-text-message" role="status">Сохранено</p>
    <button v-if="dirty && !saving" type="button" class="btn btn-outline-info btn-sm mt-1 mb-0" @mousedown.prevent @click="save">{{ error ? 'Повторить сохранение' : 'Сохранить' }}</button>
  </div>
</template>
<style scoped>
.outlay-work-text { min-width: 0; margin-top: .75rem; white-space: normal; }
label { font-size: .75rem; margin-bottom: .25rem; color: var(--outlay-text); }
textarea.form-control { resize: vertical; min-height: 3.5rem; font-size: .8125rem; }
.work-text-meta, .work-text-message { font-size: .6875rem; margin: .25rem 0 0; white-space: normal; }
.work-text-meta { color: var(--outlay-muted); }
</style>
