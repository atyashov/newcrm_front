<script setup>
import { ref, watch } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import { fetchBorrowingById } from "@/services/borrowingsService"

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  borrowingId: { type: [Number, String], default: null },
  initialData: { type: Object, default: null },
})
const emit = defineEmits(["close", "edit"])
const borrowing = ref(null)
const isLoading = ref(false)
const loadError = ref("")

const formatMoney = (value) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const close = () => {
  emit("close")
  borrowing.value = null
  loadError.value = ""
}

const loadBorrowing = async () => {
  if (!props.borrowingId || !props.isOpen) return
  try {
    isLoading.value = true
    loadError.value = ""
    borrowing.value = await fetchBorrowingById(props.borrowingId)
  } catch (error) {
    console.error("Не удалось загрузить займ", error)
    loadError.value = "Не удалось загрузить данные займа."
  } finally {
    isLoading.value = false
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    borrowing.value = null
    loadError.value = ""
    return
  }
  borrowing.value = props.initialData ? { ...props.initialData } : null
  loadBorrowing()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="props.isOpen" class="modal fade show d-block" role="dialog" aria-modal="true">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Просмотр займа</h5>
            <button type="button" class="btn-close" aria-label="Закрыть" @click="close"></button>
          </div>
          <div class="modal-body">
            <div v-if="isLoading" class="text-center py-3"><span class="spinner-border spinner-border-sm text-success"></span></div>
            <p v-else-if="loadError" class="text-danger small">{{ loadError }}</p>
            <dl v-else-if="borrowing" class="row mb-0">
              <dt class="col-sm-5">Название</dt><dd class="col-sm-7">{{ borrowing.title }}</dd>
              <dt class="col-sm-5">Сумма</dt><dd class="col-sm-7">{{ formatMoney(borrowing.amount) }}</dd>
              <dt class="col-sm-5">Дата</dt><dd class="col-sm-7">{{ borrowing.date }}</dd>
              <dt class="col-sm-5">Отправитель</dt><dd class="col-sm-7">{{ borrowing.subdivision_sender?.title ?? "Не указан" }}</dd>
              <dt class="col-sm-5">Касса отправителя</dt><dd class="col-sm-7">{{ borrowing.cash_box_sender?.title ?? "Не указана" }}</dd>
              <dt class="col-sm-5">Получатель</dt><dd class="col-sm-7">{{ borrowing.subdivision_receiver?.title ?? "Не указан" }}</dd>
              <dt class="col-sm-5">Касса получателя</dt><dd class="col-sm-7">{{ borrowing.cash_box_receiver?.title ?? "Не указана" }}</dd>
              <dt class="col-sm-5">Подписание</dt><dd class="col-sm-7">{{ borrowing.signing || "Не указано" }}</dd>
            </dl>
          </div>
          <div class="modal-footer">
            <MaterialButton color="secondary" variant="outline" @click="close">Закрыть</MaterialButton>
            <MaterialButton v-if="borrowing" color="info" @click="emit('edit', borrowing)">Редактировать</MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="close"></div>
    </div>
  </Teleport>
</template>
