<script setup>
import { computed, reactive, ref, watch } from "vue"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import MaterialTextarea from "@/components/MaterialTextarea.vue"
import { fetchBorrowingById } from "@/services/borrowingsService"

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  isSaving: { type: Boolean, default: false },
  borrowingId: { type: [Number, String], default: null },
  initialData: { type: Object, default: null },
  currentSubdivisionId: { type: [Number, String], default: null },
  subdivisionOptions: { type: Array, default: () => [] },
  cashBoxOptions: { type: Array, default: () => [] },
})

const emit = defineEmits(["close", "submit"])

const today = () => {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

const formState = reactive({
  title: "",
  amount: "",
  signing: "",
  date: today(),
  subdivision_sender_id: null,
  subdivision_receiver_id: null,
  cash_box_sender_id: null,
  cash_box_receiver_id: null,
})
const invalidFields = ref(new Set())
const isLoading = ref(false)
const loadError = ref("")

const isEditMode = computed(
  () => props.borrowingId !== null && props.borrowingId !== undefined,
)
const isFormDisabled = computed(() => props.isSaving || isLoading.value)

const applyData = (payload = {}) => {
  const item = payload?.item ?? payload
  formState.title = item?.title ?? ""
  formState.amount = String(item?.amount ?? "")
  formState.signing = item?.signing ?? ""
  formState.date = item?.date ?? today()
  formState.subdivision_sender_id =
    item?.subdivision_sender_id ??
    item?.subdivision_sender?.id ??
    props.currentSubdivisionId ??
    null
  formState.subdivision_receiver_id =
    item?.subdivision_receiver_id ?? item?.subdivision_receiver?.id ?? null
  formState.cash_box_sender_id =
    item?.cash_box_sender_id ?? item?.cash_box_sender?.id ?? null
  formState.cash_box_receiver_id =
    item?.cash_box_receiver_id ?? item?.cash_box_receiver?.id ?? null
}

const resetForm = () => {
  applyData()
  invalidFields.value = new Set()
  loadError.value = ""
}

const loadBorrowing = async () => {
  if (!isEditMode.value || !props.borrowingId || !props.isOpen) return

  try {
    isLoading.value = true
    loadError.value = ""
    applyData(await fetchBorrowingById(props.borrowingId))
  } catch (error) {
    console.error("Не удалось загрузить займ", error)
    loadError.value = "Не удалось загрузить данные займа."
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
  if (!formState.title.trim()) invalid.add("title")
  if (formState.amount === "" || Number(formState.amount) < 0) invalid.add("amount")
  if (!formState.date) invalid.add("date")
  if (!formState.subdivision_sender_id) invalid.add("subdivision_sender_id")
  if (!formState.subdivision_receiver_id) invalid.add("subdivision_receiver_id")
  if (!formState.cash_box_sender_id) invalid.add("cash_box_sender_id")
  if (!formState.cash_box_receiver_id) invalid.add("cash_box_receiver_id")
  invalidFields.value = invalid

  if (invalid.size) return

  emit("submit", {
    mode: isEditMode.value ? "edit" : "create",
    id: isEditMode.value ? props.borrowingId : null,
    payload: {
      title: formState.title.trim(),
      amount: Number(formState.amount),
      signing: formState.signing.trim() || null,
      date: formState.date,
      subdivision_sender_id: Number(formState.subdivision_sender_id),
      subdivision_receiver_id: Number(formState.subdivision_receiver_id),
      cash_box_sender_id: Number(formState.cash_box_sender_id),
      cash_box_receiver_id: Number(formState.cash_box_receiver_id),
    },
  })
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return resetForm()
    invalidFields.value = new Set()
    if (props.initialData) applyData(props.initialData)
    if (isEditMode.value) loadBorrowing()
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
            <h5 class="modal-title">
              {{ isEditMode ? "Редактирование займа" : "Создание займа" }}
            </h5>
            <button type="button" class="btn-close" aria-label="Закрыть" @click="handleClose"></button>
          </div>

          <div class="modal-body">
            <p v-if="loadError" class="text-danger small">{{ loadError }}</p>
            <form class="row g-3" @submit.prevent="handleSubmit">
              <div class="col-md-6">
                <MaterialInput id="borrowing-title" v-model:value="formState.title" label="Название" isRequired :disabled="isFormDisabled" :error="invalidFields.has('title')" />
              </div>
              <div class="col-md-3">
                <MaterialInput id="borrowing-amount" v-model:value="formState.amount" label="Сумма" type="number" step="0.01" isRequired :disabled="isFormDisabled" :error="invalidFields.has('amount')" />
              </div>
              <div class="col-md-3">
                <MaterialInput id="borrowing-date" v-model:value="formState.date" label="Дата" type="date" isRequired :disabled="isFormDisabled" :error="invalidFields.has('date')" />
              </div>

              <div class="col-md-6">
                <Multiselect v-model="formState.subdivision_sender_id" placeholder="Подразделение-отправитель" :options="subdivisionOptions" :searchable="true" value-prop="value" label="label" track-by="label" :disabled="isFormDisabled" :class="{ 'is-invalid': invalidFields.has('subdivision_sender_id') }" no-results-text="Ничего не найдено" />
              </div>
              <div class="col-md-6">
                <Multiselect v-model="formState.cash_box_sender_id" placeholder="Касса-отправитель" :options="cashBoxOptions" :searchable="true" value-prop="value" label="label" track-by="label" :disabled="isFormDisabled" :class="{ 'is-invalid': invalidFields.has('cash_box_sender_id') }" no-results-text="Ничего не найдено" />
              </div>
              <div class="col-md-6">
                <Multiselect v-model="formState.subdivision_receiver_id" placeholder="Подразделение-получатель" :options="subdivisionOptions" :searchable="true" value-prop="value" label="label" track-by="label" :disabled="isFormDisabled" :class="{ 'is-invalid': invalidFields.has('subdivision_receiver_id') }" no-results-text="Ничего не найдено" />
              </div>
              <div class="col-md-6">
                <Multiselect v-model="formState.cash_box_receiver_id" placeholder="Касса-получатель" :options="cashBoxOptions" :searchable="true" value-prop="value" label="label" track-by="label" :disabled="isFormDisabled" :class="{ 'is-invalid': invalidFields.has('cash_box_receiver_id') }" no-results-text="Ничего не найдено" />
              </div>

              <div class="col-12">
                <MaterialTextarea id="borrowing-signing" v-model:value="formState.signing" placeholder="Подписание" :rows="3" :disabled="isFormDisabled" />
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
