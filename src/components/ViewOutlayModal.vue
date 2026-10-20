<script setup>
import { ref, watch } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import OutlayDocuments from "@/components/OutlayDocuments.vue"
import { fetchOutlayById } from "@/services/outlaysService"

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  outlayId: { type: [Number, String], default: null },
  initialData: { type: Object, default: null },
})
const emit = defineEmits(["close", "edit"])
const outlay = ref(null)
const isLoading = ref(false)
const loadError = ref("")

const close = () => {
  emit("close")
  outlay.value = null
  loadError.value = ""
}

const loadOutlay = async () => {
  if (!props.outlayId || !props.isOpen) return
  try {
    isLoading.value = true
    loadError.value = ""
    outlay.value = await fetchOutlayById(props.outlayId)
  } catch (error) {
    console.error("Не удалось загрузить смету", error)
    loadError.value = "Не удалось загрузить данные сметы."
  } finally {
    isLoading.value = false
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    outlay.value = null
    return
  }
  outlay.value = props.initialData ? { ...props.initialData } : null
  loadOutlay()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="props.isOpen" class="modal fade show d-block" role="dialog" aria-modal="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Смета №{{ outlay?.id }}</h5>
            <button type="button" class="btn-close" aria-label="Закрыть" @click="close"></button>
          </div>
          <div class="modal-body">
            <div v-if="isLoading" class="text-center py-3"><span class="spinner-border spinner-border-sm text-success"></span></div>
            <p v-else-if="loadError" class="text-danger small">{{ loadError }}</p>
            <dl v-else-if="outlay" class="row mb-0">
              <dt class="col-sm-4">Название</dt><dd class="col-sm-8">{{ outlay.title }}</dd>
              <dt class="col-sm-4">Дата заказа</dt><dd class="col-sm-8">{{ outlay.execution_date }}</dd>
              <dt class="col-sm-4">Дата возврата</dt><dd class="col-sm-8">{{ outlay.return_date ?? outlay['return date'] ?? "Не указана" }}</dd>
              <dt class="col-sm-4">Контрагент</dt><dd class="col-sm-8">{{ outlay.partner_entity ?? "Не указан" }}</dd>
              <dt class="col-sm-4">Получатель</dt><dd class="col-sm-8">{{ outlay.recipient_name ?? "Не указан" }}</dd>
              <dt class="col-sm-4">Итого</dt><dd class="col-sm-8">{{ outlay.total_cost ?? 0 }}</dd>
              <dt class="col-sm-4">Оплачено</dt><dd class="col-sm-8">{{ outlay.is_paid ? "Да" : "Нет" }}</dd>
            </dl>
            <OutlayDocuments v-if="outlay && !isLoading && !loadError" :outlay-id="outlay.id" />
          </div>
          <div class="modal-footer">
            <MaterialButton color="secondary" variant="outline" @click="close">Закрыть</MaterialButton>
            <MaterialButton v-if="outlay" color="info" @click="emit('edit', outlay)">Редактировать</MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="close"></div>
    </div>
  </Teleport>
</template>
