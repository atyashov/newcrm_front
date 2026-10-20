<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import DirectoryModal from "./DirectoryModal.vue"
import MaterialSelect from "./MaterialSelect.vue"
import { fetchUsers } from "@/services/usersService"
import { collectDirectoryPages } from "@/utils/directoryList"
import { fetchStatusesForOutlays } from "@/services/outlaysService"
import { patchOutlay, serverMessage } from "@/services/outlayTabsService"
import { assignmentGroups, userLabel } from "@/views/components/outlayTabs"

const props = defineProps({ item: { type: Object, required: true }, section: { type: String, required: true } })
const emit = defineEmits(["close", "saved"])
const loading = ref(true), saving = ref(false), error = ref(""), loadError = ref("")
const options = ref([]), statuses = ref([])
const form = reactive({ status_id: props.item.status_id })
for (const group of assignmentGroups) form[group.field] = [...(props.item[group.field] ?? props.item[group.relation]?.map(user => user.id) ?? [])].map(Number)
let alive = true
onBeforeUnmount(() => { alive = false })
onMounted(async () => {
  try {
    if (props.section === "status") {
      const result = await fetchStatusesForOutlays({ subdivision_id: props.item.subdivision_id })
      if (alive) statuses.value = result.map(item => ({ value: item.id, label: item.title }))
    } else {
      const users = await collectDirectoryPages(fetchUsers, { subdivision_id: props.item.subdivision_id, status: "1" })
      if (alive) {
        const known = new Map(users.map(user => [Number(user.id), { value: Number(user.id), label: userLabel(user) }]))
        for (const group of assignmentGroups) {
          for (const user of props.item[group.relation] ?? []) {
            if (!known.has(Number(user.id))) known.set(Number(user.id), { value: Number(user.id), label: `${userLabel(user)} (проверьте доступ)` })
          }
        }
        options.value = [...known.values()]
      }
    }
  } catch (e) { if (alive) loadError.value = serverMessage(e) }
  finally { if (alive) loading.value = false }
})
const save = async () => {
  if (saving.value || loading.value || loadError.value) return
  error.value = ""
  if (props.section === "status" && !form.status_id) { error.value = "Выберите статус."; return }
  saving.value = true
  try {
    const payload = props.section === "status" ? { status_id: Number(form.status_id) }
      : Object.fromEntries(assignmentGroups.map(group => [group.field, form[group.field].map(Number)]))
    const item = await patchOutlay(props.item.id, props.section, payload)
    if (alive) emit("saved", item)
  } catch (e) { if (alive) error.value = serverMessage(e) }
  finally { if (alive) saving.value = false }
}
</script>
<template>
  <DirectoryModal :title="`${section === 'status' ? 'Статус' : 'Сотрудники'} сметы №${item.id}`" :loading="loading" :is-saving="saving" :error="error" :load-error="loadError" @close="emit('close')" @submit="save">
    <MaterialSelect v-if="section === 'status'" id="quick-outlay-status" v-model="form.status_id" label="Статус" placeholder="Выберите статус" :options="statuses" />
    <div v-else class="d-flex flex-column gap-3">
      <div v-for="group in assignmentGroups" :key="group.field">
        <label :for="'quick-' + group.field" class="text-sm">{{ group.label }}</label>
        <Multiselect :id="'quick-' + group.field" v-model="form[group.field]" mode="tags" searchable :options="options" :close-on-select="false" placeholder="Не назначены" />
      </div>
    </div>
  </DirectoryModal>
</template>
