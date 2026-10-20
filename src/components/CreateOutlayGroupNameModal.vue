<script setup>
import { ref, watch } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"

const props = defineProps({
  isOpen: Boolean,
  isSaving: Boolean,
  initialData: { type: Object, default: null },
  error: { type: String, default: "" },
})
const emit = defineEmits(["close", "submit"])
const name = ref("")
const invalid = ref(false)

watch(() => props.isOpen, () => {
  name.value = props.initialData?.name ?? ""
  invalid.value = false
})

const close = () => {
  if (!props.isSaving) emit("close")
}
const submit = () => {
  if (props.isSaving) return
  invalid.value = !name.value.trim() || name.value.trim().length > 255
  if (!invalid.value) emit("submit", { name: name.value.trim() })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal fade show d-block" role="dialog" aria-modal="true"
      aria-labelledby="outlay-group-name-heading" tabindex="-1" @keydown.esc="close">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <form class="modal-content" @submit.prevent="submit">
          <div class="modal-header">
            <h5 id="outlay-group-name-heading" class="modal-title">
              {{ initialData ? "Редактирование группы" : "Создание группы" }}
            </h5>
            <button type="button" class="btn-close" aria-label="Закрыть" :disabled="isSaving" @click="close"></button>
          </div>
          <div class="modal-body">
            <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
            <MaterialInput id="outlay-group-name" v-model:value="name" label="Название"
              isRequired :disabled="isSaving" :error="invalid" />
            <p v-if="invalid" class="text-danger text-sm mt-2">Введите название длиной от 1 до 255 символов.</p>
          </div>
          <div class="modal-footer">
            <MaterialButton type="button" color="secondary" variant="outline" :disabled="isSaving" @click="close">Закрыть</MaterialButton>
            <MaterialButton type="submit" color="success" :disabled="isSaving">
              {{ isSaving ? "Сохранение..." : "Сохранить" }}
            </MaterialButton>
          </div>
        </form>
      </div>
      <div class="modal-backdrop fade show" @click="close"></div>
    </div>
  </Teleport>
</template>
