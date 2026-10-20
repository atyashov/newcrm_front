<script setup>
import { computed, reactive, ref, watch } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialCheckbox from "@/components/MaterialCheckbox.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchOutlayStatusById } from "@/services/outlayStatusesService"

const props = defineProps({
  isOpen: Boolean,
  isSaving: Boolean,
  statusId: { type: [Number, String], default: null },
  initialData: { type: Object, default: null },
  error: { type: String, default: "" },
})
const emit = defineEmits(["close", "submit"])
const form = reactive({ title: "", sort_order: "0", affects_stock: false })
const invalidFields = ref(new Set())
const isLoading = ref(false)
const loadError = ref("")
const isEdit = computed(() => props.statusId !== null && props.statusId !== undefined)
const disabled = computed(() => props.isSaving || isLoading.value)

const applyData = (item = {}) => {
  form.title = item.title ?? ""
  form.sort_order = String(item.sort_order ?? 0)
  form.affects_stock = item.affects_stock === true || Number(item.affects_stock) === 1
}
const reset = () => {
  applyData()
  invalidFields.value = new Set()
  loadError.value = ""
}
const close = () => {
  emit("close")
  reset()
}
const load = async () => {
  if (!isEdit.value || !props.statusId) return
  try {
    isLoading.value = true
    applyData(await fetchOutlayStatusById(props.statusId))
  } catch (error) {
    console.error("Не удалось загрузить статус сметы", error)
    loadError.value = "Не удалось загрузить статус сметы."
  } finally {
    isLoading.value = false
  }
}
const submit = () => {
  const invalid = new Set()
  if (!form.title.trim()) invalid.add("title")
  if (!/^\d+$/.test(form.sort_order) || Number(form.sort_order) > 65535) {
    invalid.add("sort_order")
  }
  invalidFields.value = invalid
  if (invalid.size || disabled.value) return

  emit("submit", {
    title: form.title.trim(),
    sort_order: Number(form.sort_order),
    affects_stock: Boolean(form.affects_stock),
  })
}

watch(() => props.isOpen, async (open) => {
  if (!open) return reset()
  props.initialData ? applyData(props.initialData) : reset()
  await load()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal fade show d-block" role="dialog" aria-modal="true" @keydown.esc="close">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEdit ? "Редактирование статуса" : "Создание статуса" }}</h5>
            <button type="button" class="btn-close" aria-label="Закрыть" @click="close"></button>
          </div>
          <div class="modal-body">
            <p v-if="error || loadError" class="text-danger small">{{ error || loadError }}</p>
            <form class="d-flex flex-column gap-3" @submit.prevent="submit">
              <MaterialInput id="outlay-status-title" v-model:value="form.title" label="Название" isRequired :disabled="disabled" :error="invalidFields.has('title')" />
              <MaterialInput id="outlay-status-order" v-model:value="form.sort_order" label="Порядок сортировки" type="number" :disabled="disabled" :error="invalidFields.has('sort_order')" />
              <MaterialCheckbox id="outlay-status-affects-stock" v-model="form.affects_stock" name="affects_stock" :disabled="disabled">
                Влияет на склад
              </MaterialCheckbox>
            </form>
          </div>
          <div class="modal-footer">
            <MaterialButton type="button" color="secondary" variant="outline" @click="close">Закрыть</MaterialButton>
            <MaterialButton type="button" color="success" :disabled="disabled" @click="submit">
              {{ isSaving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать" }}
            </MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="close"></div>
    </div>
  </Teleport>
</template>
