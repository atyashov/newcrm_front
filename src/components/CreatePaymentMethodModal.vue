<script setup>
import { computed, reactive, ref, watch } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchPaymentMethodById } from "@/services/paymentMethodsService"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  paymentMethodId: {
    type: [Number, String],
    default: null,
  },
  initialData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(["close", "submit"])

const formState = reactive({
  title: "",
})
const invalidFields = ref(new Set())
const isLoading = ref(false)
const loadError = ref("")

const isEditMode = computed(
  () =>
    props.paymentMethodId !== null && props.paymentMethodId !== undefined,
)
const isFormDisabled = computed(() => props.isSaving || isLoading.value)

const applyData = (payload = {}) => {
  const item = payload?.item ?? payload
  formState.title = item?.title ?? ""
}

const resetForm = () => {
  formState.title = ""
  invalidFields.value = new Set()
  loadError.value = ""
}

const loadPaymentMethod = async () => {
  if (!isEditMode.value || !props.paymentMethodId || !props.isOpen) {
    return
  }

  try {
    isLoading.value = true
    loadError.value = ""
    applyData(await fetchPaymentMethodById(props.paymentMethodId))
  } catch (error) {
    console.error("Не удалось загрузить способ оплаты", error)
    loadError.value = "Не удалось загрузить способ оплаты."
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

  if (!formState.title.trim()) {
    invalidFields.value = new Set(["title"])
    return
  }

  invalidFields.value = new Set()
  emit("submit", {
    mode: isEditMode.value ? "edit" : "create",
    id: isEditMode.value ? props.paymentMethodId : null,
    payload: {
      title: formState.title.trim(),
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
  (isOpen) => {
    if (!isOpen) {
      resetForm()
      return
    }

    invalidFields.value = new Set()

    if (isEditMode.value) {
      if (props.initialData) {
        applyData(props.initialData)
      }
      loadPaymentMethod()
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
      aria-labelledby="paymentMethodModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="paymentMethodModalTitle" class="modal-title">
              {{
                isEditMode
                  ? "Редактирование способа оплаты"
                  : "Создание способа оплаты"
              }}
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

            <form @submit.prevent="handleSubmit">
              <MaterialInput
                id="payment-method-title"
                v-model:value="formState.title"
                label="Название"
                isRequired
                :disabled="isFormDisabled"
                :error="invalidFields.has('title')"
              />
            </form>
          </div>

          <div class="modal-footer">
            <MaterialButton
              color="secondary"
              variant="outline"
              type="button"
              @click="handleClose"
            >
              Закрыть
            </MaterialButton>
            <MaterialButton
              color="success"
              type="button"
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
