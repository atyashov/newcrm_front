<script setup>
import { ref, watch } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import { fetchExpenseById } from "@/services/expensesService"

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  expenseId: { type: [Number, String], default: null },
  initialData: { type: Object, default: null },
})
const emit = defineEmits(["close", "edit"])
const expense = ref(null)
const isLoading = ref(false)
const loadError = ref("")

const formatMoney = (value) => new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)

const close = () => {
  emit("close")
  expense.value = null
  loadError.value = ""
}

const loadExpense = async () => {
  if (!props.expenseId || !props.isOpen) return
  try {
    isLoading.value = true
    loadError.value = ""
    expense.value = await fetchExpenseById(props.expenseId)
  } catch (error) {
    console.error("Не удалось загрузить расход", error)
    loadError.value = "Не удалось загрузить данные расхода."
  } finally {
    isLoading.value = false
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    expense.value = null
    loadError.value = ""
    return
  }
  expense.value = props.initialData ? { ...props.initialData } : null
  loadExpense()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="props.isOpen" class="modal fade show d-block" role="dialog" aria-modal="true">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Просмотр расхода</h5>
            <button type="button" class="btn-close" aria-label="Закрыть" @click="close"></button>
          </div>
          <div class="modal-body">
            <div v-if="isLoading" class="text-center py-3"><span class="spinner-border spinner-border-sm text-success"></span></div>
            <p v-else-if="loadError" class="text-danger small">{{ loadError }}</p>
            <dl v-else-if="expense" class="row mb-0">
              <dt class="col-sm-5">Дата</dt><dd class="col-sm-7">{{ expense.date }}</dd>
              <dt class="col-sm-5">Цена</dt><dd class="col-sm-7">{{ formatMoney(expense.price) }}</dd>
              <dt class="col-sm-5">Количество</dt><dd class="col-sm-7">{{ expense.quantity }}</dd>
              <dt class="col-sm-5">Сумма</dt><dd class="col-sm-7">{{ formatMoney(expense.amount) }}</dd>
              <dt class="col-sm-5">Группа расходов</dt><dd class="col-sm-7">{{ expense.expense_group?.title ?? "Не указана" }}</dd>
              <dt class="col-sm-5">Касса</dt><dd class="col-sm-7">{{ expense.cash_box?.title ?? "Не указана" }}</dd>
              <dt class="col-sm-5">Подразделение</dt><dd class="col-sm-7">{{ expense.subdivision?.title ?? "Не указано" }}</dd>
            </dl>
          </div>
          <div class="modal-footer">
            <MaterialButton color="secondary" variant="outline" @click="close">Закрыть</MaterialButton>
            <MaterialButton v-if="expense" color="info" @click="emit('edit', expense)">Редактировать</MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="close"></div>
    </div>
  </Teleport>
</template>
