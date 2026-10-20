<script setup>
import MaterialButton from "./MaterialButton.vue"
defineProps({ view: Boolean, edit: { type: Boolean, default: true }, remove: { type: Boolean, default: true },
  disabled: Boolean, editDisabled: Boolean, deleteDisabled: Boolean })
const emit = defineEmits(["view", "edit", "delete"])
</script>
<template>
  <div class="app-list-actions">
    <MaterialButton v-if="view" type="button" color="secondary" variant="outline" size="sm" title="Просмотреть" aria-label="Просмотреть" :disabled="disabled" @click.stop.prevent="emit('view')"><i class="material-icons" aria-hidden="true">visibility</i></MaterialButton>
    <MaterialButton v-if="edit" type="button" color="info" variant="outline" size="sm" title="Редактировать" aria-label="Редактировать" :disabled="disabled || editDisabled" @click.stop.prevent="emit('edit')"><i class="material-icons" aria-hidden="true">edit</i></MaterialButton>
    <MaterialButton v-if="remove" type="button" color="danger" variant="outline" size="sm" title="Удалить" aria-label="Удалить" :disabled="disabled || deleteDisabled" @click.stop.prevent="emit('delete')"><i class="material-icons" aria-hidden="true">delete</i></MaterialButton>
  </div>
</template>
