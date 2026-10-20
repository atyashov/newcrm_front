<script setup>
import { computed, ref, watch } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import { fetchCashBoxById } from "@/services/cashBoxesService"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  cashBoxId: {
    type: [Number, String],
    default: null,
  },
  initialData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(["close", "edit"])

const cashBox = ref(null)
const isLoading = ref(false)
const loadError = ref("")

const paymentMethodTitle = computed(
  () => cashBox.value?.payment_method?.title ?? "Не указан",
)

const formatBalance = (value) => {
  const number = Number(value)
  return Number.isFinite(number)
    ? new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(number)
    : "0,00"
}

const handleClose = () => {
  emit("close")
  cashBox.value = null
  loadError.value = ""
}

const loadCashBox = async () => {
  if (!props.cashBoxId || !props.isOpen) {
    return
  }

  try {
    isLoading.value = true
    loadError.value = ""
    cashBox.value = await fetchCashBoxById(props.cashBoxId)
  } catch (error) {
    console.error("Не удалось загрузить кассу", error)
    loadError.value = "Не удалось загрузить данные кассы."
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      cashBox.value = null
      return
    }

    cashBox.value = props.initialData ? { ...props.initialData } : null
    loadCashBox()
  },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.isOpen"
      class="modal fade show d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewCashBoxModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="viewCashBoxModalTitle" class="modal-title">
              Просмотр кассы
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Закрыть"
              @click="handleClose"
            ></button>
          </div>

          <div class="modal-body">
            <div v-if="isLoading" class="text-center py-3">
              <span class="spinner-border spinner-border-sm text-success"></span>
            </div>
            <p v-else-if="loadError" class="text-danger small mb-0">
              {{ loadError }}
            </p>
            <dl v-else-if="cashBox" class="row mb-0">
              <dt class="col-sm-5">Название</dt>
              <dd class="col-sm-7">{{ cashBox.title }}</dd>

              <dt class="col-sm-5">Баланс</dt>
              <dd class="col-sm-7">{{ formatBalance(cashBox.balance) }}</dd>

              <dt class="col-sm-5">Метод оплаты</dt>
              <dd class="col-sm-7">{{ paymentMethodTitle }}</dd>

              <dt class="col-sm-5">Порядок сортировки</dt>
              <dd class="col-sm-7">{{ cashBox.sort_order }}</dd>

              <dt class="col-sm-5">На панели управления</dt>
              <dd class="col-sm-7">
                {{ cashBox.is_dashboard ? "Да" : "Нет" }}
              </dd>
            </dl>
          </div>

          <div class="modal-footer">
            <MaterialButton
              type="button"
              color="secondary"
              variant="outline"
              @click="handleClose"
            >
              Закрыть
            </MaterialButton>
            <MaterialButton
              v-if="cashBox"
              type="button"
              color="info"
              @click="emit('edit', cashBox)"
            >
              Редактировать
            </MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="handleClose"></div>
    </div>
  </Teleport>
</template>
