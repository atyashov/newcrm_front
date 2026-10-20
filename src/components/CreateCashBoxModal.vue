<script setup>
import { computed, reactive, ref, watch } from "vue"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialCheckbox from "@/components/MaterialCheckbox.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchCashBoxById } from "@/services/cashBoxesService"
import { fetchPaymentMethods } from "@/services/paymentMethodsService"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  isSaving: {
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

const emit = defineEmits(["close", "submit"])

const initialState = {
  title: "",
  opening_balance: "",
  payment_method_id: null,
  sort_order: "0",
  is_dashboard: false,
}

const formState = reactive({ ...initialState })
const paymentMethodOptions = ref([])
const invalidFields = ref(new Set())
const isLoading = ref(false)
const isPaymentMethodsLoading = ref(false)
const loadError = ref("")

const isEditMode = computed(
  () => props.cashBoxId !== null && props.cashBoxId !== undefined,
)
const isFormDisabled = computed(
  () => props.isSaving || isLoading.value || isPaymentMethodsLoading.value,
)

const applyData = (payload = {}) => {
  const item = payload?.item ?? payload
  formState.title = item?.title ?? ""
  formState.opening_balance = String(item?.opening_balance ?? item?.balance ?? "")
  formState.payment_method_id =
    item?.payment_method_id ?? item?.payment_method?.id ?? null
  formState.sort_order = String(item?.sort_order ?? 0)
  formState.is_dashboard = Boolean(item?.is_dashboard)
}

const resetForm = () => {
  Object.assign(formState, initialState)
  invalidFields.value = new Set()
  loadError.value = ""
}

const loadPaymentMethods = async () => {
  try {
    isPaymentMethodsLoading.value = true
    const response = await fetchPaymentMethods()
    paymentMethodOptions.value = (response?.data ?? []).map((item) => ({
      value: item.id,
      label: item.title ?? "Без названия",
    }))
  } catch (error) {
    console.error("Не удалось загрузить методы оплаты", error)
    loadError.value = "Не удалось загрузить методы оплаты."
  } finally {
    isPaymentMethodsLoading.value = false
  }
}

const loadCashBox = async () => {
  if (!isEditMode.value || !props.cashBoxId || !props.isOpen) {
    return
  }

  try {
    isLoading.value = true
    loadError.value = ""
    applyData(await fetchCashBoxById(props.cashBoxId))
  } catch (error) {
    console.error("Не удалось загрузить кассу", error)
    loadError.value = "Не удалось загрузить данные кассы."
  } finally {
    isLoading.value = false
  }
}

const handleClose = () => {
  emit("close")
  resetForm()
}

const handleSubmit = () => {
  if (isFormDisabled.value) {
    return
  }

  const invalid = new Set()

  if (!formState.title.trim()) invalid.add("title")
  if (formState.opening_balance === "") invalid.add("opening_balance")
  if (!formState.payment_method_id) invalid.add("payment_method_id")
  if (formState.sort_order === "") invalid.add("sort_order")

  invalidFields.value = invalid

  if (invalid.size) {
    return
  }

  emit("submit", {
    mode: isEditMode.value ? "edit" : "create",
    id: isEditMode.value ? props.cashBoxId : null,
    payload: {
      title: formState.title.trim(),
      opening_balance: Number(formState.opening_balance),
      payment_method_id: Number(formState.payment_method_id),
      sort_order: Number(formState.sort_order),
      is_dashboard: Boolean(formState.is_dashboard),
    },
  })
}

const handleClickOutside = () => {
  if (confirm("Вы уверены, что хотите закрыть окно?")) {
    handleClose()
  }
}

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (!isOpen) {
      resetForm()
      return
    }

    invalidFields.value = new Set()
    await loadPaymentMethods()

    if (isEditMode.value) {
      if (props.initialData) {
        applyData(props.initialData)
      }
      await loadCashBox()
    } else {
      resetForm()
    }
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
      aria-labelledby="cashBoxModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="cashBoxModalTitle" class="modal-title">
              {{ isEditMode ? "Редактирование кассы" : "Создание кассы" }}
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Закрыть"
              @click="handleClose"
            ></button>
          </div>

          <div class="modal-body" @click.stop>
            <p v-if="loadError" class="text-danger small mb-3">
              {{ loadError }}
            </p>

            <form class="row g-3" @submit.prevent="handleSubmit">
              <div class="col-md-6">
                <MaterialInput
                  id="cash-box-title"
                  v-model:value="formState.title"
                  label="Название"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('title')"
                />
              </div>

              <div class="col-md-6">
                <MaterialInput
                  id="cash-box-opening-balance"
                  v-model:value="formState.opening_balance"
                  label="Начальный баланс"
                  type="number"
                  step="0.01"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('opening_balance')"
                />
              </div>

              <div class="col-md-6">
                <Multiselect
                  v-model="formState.payment_method_id"
                  placeholder="Метод оплаты"
                  :options="paymentMethodOptions"
                  :searchable="true"
                  :can-clear="true"
                  :can-deselect="true"
                  value-prop="value"
                  label="label"
                  track-by="label"
                  no-options-text="Методы оплаты не найдены"
                  no-results-text="Ничего не найдено"
                  :disabled="isFormDisabled"
                  :class="{
                    'is-invalid': invalidFields.has('payment_method_id'),
                  }"
                />
                <p
                  v-if="invalidFields.has('payment_method_id')"
                  class="text-danger text-xs mt-1 mb-0"
                >
                  Выберите метод оплаты.
                </p>
              </div>

              <div class="col-md-6">
                <MaterialInput
                  id="cash-box-sort-order"
                  v-model:value="formState.sort_order"
                  label="Порядок сортировки"
                  type="number"
                  step="1"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('sort_order')"
                />
              </div>

              <div class="col-12">
                <MaterialCheckbox
                  id="cash-box-is-dashboard"
                  v-model="formState.is_dashboard"
                  name="is_dashboard"
                  :disabled="isFormDisabled"
                >
                  Показывать на панели управления
                </MaterialCheckbox>
              </div>
            </form>
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
              type="button"
              color="success"
              :disabled="isFormDisabled"
              @click="handleSubmit"
            >
              {{ props.isSaving ? "Сохранение..." : isEditMode ? "Сохранить" : "Создать" }}
            </MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="handleClickOutside"></div>
    </div>
  </Teleport>
</template>
