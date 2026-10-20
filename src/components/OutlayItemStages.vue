<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { updateOutlayItemStage, serverMessage } from '@/services/outlayTabsService'
import { itemStageFields, stageChecked } from '@/views/components/outlayItemStages'
import { displayDateTime, userLabel } from '@/views/components/outlayTabs'

const props = defineProps({ outlayId: { type: [String, Number], required: true }, item: { type: Object, required: true }, columns: Boolean })
const emit = defineEmits(['updated'])
const saving = ref(false), pendingFlag = ref(''), error = ref('')
let revision = 0
onBeforeUnmount(() => { revision++ })
watch(() => [props.outlayId, props.item.id], () => { revision++; saving.value = false; pendingFlag.value = ''; error.value = '' })
const change = async (flag, event) => {
  const checked = event.target.checked
  // Keep the confirmed server state until PATCH succeeds, including on errors.
  event.target.checked = stageChecked(props.item.stages?.[flag])
  if (saving.value) return
  const current = revision
  saving.value = true; pendingFlag.value = flag; error.value = ''
  try {
    const item = await updateOutlayItemStage(props.outlayId, props.item.id, flag, checked)
    if (current === revision) emit('updated', item)
  } catch (e) { if (current === revision) error.value = serverMessage(e) }
  finally { if (current === revision) { saving.value = false; pendingFlag.value = '' } }
}
</script>
<template>
  <div class="item-stage-controls" :class="{ 'is-columns': columns }" :aria-busy="saving">
    <div class="item-stage-grid">
      <div v-for="flag in itemStageFields" :key="flag.key">
      <div class="form-check p-0" :class="{ 'item-stage-issue': ['lost','defective'].includes(flag.key) && stageChecked(item.stages?.[flag.key]) }">
        <input :id="`outlay-${outlayId}-item-${item.id}-${flag.key}`" type="checkbox" class="form-check-input" :checked="stageChecked(item.stages?.[flag.key])" :disabled="saving" @change="change(flag.key, $event)" />
        <label :for="`outlay-${outlayId}-item-${item.id}-${flag.key}`" class="custom-control-label" :class="{ 'visually-hidden': columns }">{{ flag.label }}<span v-if="pendingFlag === flag.key" class="ms-1" role="status">...</span></label>
      </div>
      <p v-if="item.stages?.editors?.[flag.key]?.updated_at" class="stage-editor">{{ item.stages.editors[flag.key].user ? userLabel(item.stages.editors[flag.key].user) : 'Пользователь не указан' }} · {{ displayDateTime(item.stages.editors[flag.key].updated_at) }}</p>
      </div>
    </div>
    <p v-if="error" class="text-danger stage-error" role="alert">{{ error }} Не удалось подтвердить изменение. Повторите попытку или обновите страницу.</p>
    <p v-if="item.stages?.updated_at && !Object.values(item.stages.editors || {}).some(editor => editor?.updated_at)" class="stage-editor">Последнее изменение статусов позиции: {{ item.stages.updated_by ? userLabel(item.stages.updated_by) : 'Пользователь не указан' }} · {{ displayDateTime(item.stages.updated_at) }}</p>
  </div>
</template>
<style scoped>
.item-stage-controls { min-width: 17rem; }
.item-stage-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .35rem .75rem; }
.item-stage-grid .form-check { margin: 0; min-height: 1.25rem; display: flex; align-items: center; gap: .35rem; }
.item-stage-grid .form-check-input { flex-shrink: 0; float: none; margin: 0; }
.item-stage-grid label { margin: 0; font-size: .75rem; color: inherit; }
.item-stage-issue { color: var(--bs-danger); }
.stage-error, .stage-editor { margin: .5rem 0 0; font-size: .6875rem; white-space: normal; }
.stage-editor { color: var(--outlay-muted); }
.item-stage-grid .form-check-input { width: 26px; height: 26px; cursor: pointer; }
.item-stage-grid .form-check-input:disabled { cursor: wait; }
.is-columns { min-width: 0; }
.is-columns .item-stage-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0; }
.is-columns .item-stage-grid > div { padding: .35rem .2rem; min-width: 0; }
.is-columns .form-check { justify-content: center; }
.is-columns .form-check .form-check-input { margin: 0 !important; }
.is-columns .stage-editor { text-align: center; font-size: .625rem; overflow-wrap: anywhere; }
</style>
