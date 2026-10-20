<script setup>
import { computed, reactive, ref, watch } from "vue"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchExpenseById } from "@/services/expensesService"

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
  expenseId: { type: [Number, String], default: null },
  initialData: { type: Object, default: null },
  subdivisionId: { type: [Number, String], default: null },
  expenseGroupOptions: { type: Array, default: () => [] },
  cashBoxOptions: { type: Array, default: () => [] },
})

const emit = defineEmits(["close", "submit"])

const today = () => {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}
const formState = reactive({
  date: today(),
  price: "",
  quantity: "1",
  amount: "",
  expense_group_id: null,
  cash_box_id: null,
})
const invalidFields = ref(new Set())
const isLoading = ref(false)
const loadError = ref("")

const isEditMode = computed(() => props.expenseId !== null && props.expenseId !== undefined)
const isFormDisabled = computed(() => props.isSaving || isLoading.value)

const applyData = (payload = {}) => {
  const item = payload?.item ?? payload
  formState.date = item?.date ?? today()
  formState.price = String(item?.price ?? "")
  formState.quantity = String(item?.quantity ?? 1)
  formState.amount = String(item?.amount ?? "")
  formState.expense_group_id = item?.expense_group_id ?? item?.expense_group?.id ?? null
  formState.cash_box_id = item?.cash_box_id ?? item?.cash_box?.id ?? null
}

const resetForm = () => {
  applyData()
  invalidFields.value = new Set()
  loadError.value = ""
}

const loadExpense = async () => {
  if (!isEditMode.value || !props.expenseId || !props.isOpen) return

  try {
    isLoading.value = true
    loadError.value = ""
    applyData(await fetchExpenseById(props.expenseId))
  } catch (error) {
    console.error("Не удалось загрузить расход", error)
    loadError.value = "Не удалось загрузить данные расхода."
  } finally {
    isLoading.value = false
  }
}

const handleClose = () => {
  emit("close")
  resetForm()
}

const handleSubmit = () => {
  if (isFormDisabled.value) return

  const invalid = new Set()
  if (!formState.date) invalid.add("date")
  if (formState.price === "" || Number(formState.price) < 0) invalid.add("price")
  if (!Number.isInteger(Number(formState.quantity)) || Number(formState.quantity) < 1) invalid.add("quantity")
  if (formState.amount === "" || Number(formState.amount) < 0) invalid.add("amount")
  if (!formState.expense_group_id) invalid.add("expense_group_id")
  if (!formState.cash_box_id) invalid.add("cash_box_id")
  if (!props.subdivisionId) invalid.add("subdivision_id")
  invalidFields.value = invalid

  if (invalid.size) return

  emit("submit", {
    mode: isEditMode.value ? "edit" : "create",
    id: isEditMode.value ? props.expenseId : null,
    payload: {
      date: formState.date,
      price: Number(formState.price),
      quantity: Number(formState.quantity),
      amount: Number(formState.amount),
      subdivision_id: Number(props.subdivisionId),
      expense_group_id: Number(formState.expense_group_id),
      cash_box_id: Number(formState.cash_box_id),
    },
  })
}

watch(
  [() => formState.price, () => formState.quantity],
  ([priceValue, quantityValue]) => {
    if (priceValue === "" || quantityValue === "") {
      formState.amount = ""
      return
    }

    const price = Number(priceValue)
    const quantity = Number(quantityValue)

    formState.amount =
      Number.isFinite(price) && Number.isFinite(quantity)
        ? (price * quantity).toFixed(2)
        : ""
  },
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return resetForm()
    invalidFields.value = new Set()
    if (props.initialData) applyData(props.initialData)
    if (isEditMode.value) loadExpense()
    else resetForm()
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-if="props.isOpen" class="modal fade show d-block" role="dialog" aria-modal="true">
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditMode ? "Редактирование расхода" : "Создание расхода" }}</h5>
            <button type="button" class="btn-close" aria-label="Закрыть" @click="handleClose"></button>
          </div>
          <div class="modal-body">
            <p v-if="loadError" class="text-danger small">{{ loadError }}</p>
            <p v-if="invalidFields.has('subdivision_id')" class="text-danger small">
              Сначала выберите подразделение.
            </p>
            <form class="row g-3" @submit.prevent="handleSubmit">
              <div class="col-md-6">
                <MaterialInput id="expense-date" v-model:value="formState.date" label="Дата" type="date" isRequired :disabled="isFormDisabled" :error="invalidFields.has('date')" />
              </div>
              <div class="col-md-6">
                <MaterialInput id="expense-price" v-model:value="formState.price" label="Цена" type="number" step="0.01" isRequired :disabled="isFormDisabled" :error="invalidFields.has('price')" />
              </div>
              <div class="col-md-6">
                <MaterialInput id="expense-quantity" v-model:value="formState.quantity" label="Количество" type="number" step="1" isRequired :disabled="isFormDisabled" :error="invalidFields.has('quantity')" />
              </div>
              <div class="col-md-6">
                <MaterialInput id="expense-amount" v-model:value="formState.amount" label="Сумма" type="number" step="0.01" isRequired disabled :error="invalidFields.has('amount')" />
              </div>
              <div class="col-md-6">
                <Multiselect v-model="formState.expense_group_id" placeholder="Группа расходов" :options="expenseGroupOptions" :searchable="true" value-prop="value" label="label" track-by="label" :disabled="isFormDisabled" :class="{ 'is-invalid': invalidFields.has('expense_group_id') }" no-results-text="Ничего не найдено" />
              </div>
              <div class="col-md-6">
                <Multiselect v-model="formState.cash_box_id" placeholder="Касса" :options="cashBoxOptions" :searchable="true" value-prop="value" label="label" track-by="label" :disabled="isFormDisabled" :class="{ 'is-invalid': invalidFields.has('cash_box_id') }" no-results-text="Ничего не найдено" />
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <MaterialButton color="secondary" variant="outline" @click="handleClose">Закрыть</MaterialButton>
            <MaterialButton color="success" :disabled="isFormDisabled" @click="handleSubmit">
              {{ props.isSaving ? "Сохранение..." : isEditMode ? "Сохранить" : "Создать" }}
            </MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="handleClose"></div>
    </div>
  </Teleport>
</template>
