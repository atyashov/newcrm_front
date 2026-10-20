<script setup>
import { computed, ref, watch } from "vue"
import MaterialInput from "@/components/MaterialInput.vue"
import MaterialButton from "@/components/MaterialButton.vue"
import { fetchStoreById } from "@/services/storesService"

const props = defineProps({
  isOpen: Boolean,
  isSaving: Boolean,
  storeId: { type: [Number, String], default: null },
  initialData: { type: Object, default: null },
  error: { type: String, default: "" },
})
const emit = defineEmits(["close", "submit"])
const title = ref("")
const loading = ref(false)
const loadError = ref("")
const invalid = ref(false)
const editing = computed(() => props.storeId !== null)
let version = 0

watch(() => [props.isOpen, props.storeId], async () => {
  const current = ++version
  loading.value = false
  loadError.value = ""
  invalid.value = false
  title.value = props.initialData?.title ?? ""
  if (!props.isOpen || !editing.value) return
  loading.value = true
  try {
    const item = await fetchStoreById(props.storeId)
    if (current === version) title.value = item.title ?? ""
  } catch (err) {
    if (current === version) loadError.value = err.response?.data?.message || err.message
  } finally {
    if (current === version) loading.value = false
  }
})

const submit = () => {
  if (loading.value || props.isSaving || loadError.value) return
  invalid.value = !title.value.trim() || title.value.trim().length > 255
  if (!invalid.value) emit("submit", { id: props.storeId, payload: { title: title.value.trim() } })
}
const close = () => { if (!props.isSaving) emit("close") }
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal fade show d-block" role="dialog" aria-modal="true" aria-labelledby="store-modal-title" tabindex="-1" @keydown.esc="close">
      <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content" @submit.prevent="submit">
          <div class="modal-header">
            <h5 id="store-modal-title" class="modal-title">{{ editing ? "Редактирование склада" : "Создание склада" }}</h5>
            <button type="button" class="btn-close" aria-label="Закрыть" :disabled="isSaving" @click="close"></button>
          </div>
          <div class="modal-body">
            <p v-if="loading" class="text-muted">Загрузка...</p>
            <p v-if="loadError || error" class="text-danger" role="alert">{{ loadError || error }}</p>
            <MaterialInput id="store-title" v-model:value="title" label="Название" isRequired :disabled="loading || isSaving" :error="invalid" />
            <p v-if="invalid" class="text-danger text-xs mt-2">Введите название до 255 символов.</p>
          </div>
          <div class="modal-footer">
            <MaterialButton type="button" color="secondary" variant="outline" :disabled="isSaving" @click="close">Закрыть</MaterialButton>
            <MaterialButton type="submit" color="success" :disabled="loading || isSaving || Boolean(loadError)">{{ isSaving ? "Сохранение..." : editing ? "Сохранить" : "Создать" }}</MaterialButton>
          </div>
        </form>
      </div>
      <div class="modal-backdrop fade show" @click="close"></div>
    </div>
  </Teleport>
</template>
