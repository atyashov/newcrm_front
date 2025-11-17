<script setup>
import { Teleport, reactive, ref, watch, onMounted, computed } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchClientTypes } from "@/services/clientTypesService"
import { fetchIndividualById } from "@/services/individualsService"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  clientId: {
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
  name: "",
  phone: "",
  email: "",
  social: "",
  messenger: "",
  personal_sale: "",
  passport_serial: "",
  passport_number: "",
  date_of_passport: "",
  issued_by: "",
  birthday: "",
  registration: "",
  address: "",
  client_type_id: "",
}

const formState = reactive({ ...initialState })
const clientTypes = ref([])
const clientTypesLoading = ref(false)
const clientTypesError = ref("")
const clientLoadError = ref("")
const isClientLoading = ref(false)
const invalidFields = ref(new Set())
const isEditMode = computed(
  () => props.clientId !== null && props.clientId !== undefined
)

const isFormDisabled = computed(() => props.isSaving || isClientLoading.value)

const normalizeClient = (payload = {}) => {
  const clientType = payload.client_type

  return {
    name: payload.name ?? "",
    phone: payload.phone ?? "",
    email: payload.email ?? "",
    social: payload.social ?? "",
    messenger: payload.messenger ?? "",
    personal_sale: payload.personal_sale ?? "",
    passport_serial: payload.passport_serial ?? "",
    passport_number: payload.passport_number ?? "",
    date_of_passport: payload.date_of_passport ?? "",
    issued_by: payload.issued_by ?? "",
    birthday: payload.birthday ?? "",
    registration: payload.registration ?? "",
    address: payload.address ?? "",
    client_type_id:
      payload.client_type_id ??
      (typeof clientType === "object" ? clientType.id ?? "" : clientType ?? ""),
  }
}

const applyClientData = (payload = {}) => {
  const normalized = normalizeClient(payload)
  Object.assign(formState, normalized)
}

const resetForm = () => {
  Object.assign(formState, initialState)
  invalidFields.value = new Set()
}

const handleClose = () => {
  emit("close")
  resetForm()
  clientLoadError.value = ""
}

const requiredFields = ["name", "phone", "client_type_id"]

const handleSubmit = () => {
  if (isFormDisabled.value) {
    return
  }

  const missingFields = requiredFields.filter((key) => {
    const value = formState[key]
    return value === null || value === undefined || String(value).trim() === ""
  })

  if (missingFields.length) {
    invalidFields.value = new Set(missingFields)
    return
  }

  invalidFields.value = new Set()

  emit("submit", {
    mode: isEditMode.value ? "edit" : "create",
    id: isEditMode.value ? props.clientId : null,
    payload: { ...formState },
  })
}

const loadClientTypes = async () => {
  if (clientTypesLoading.value) {
    return
  }

  try {
    clientTypesLoading.value = true
    clientTypesError.value = ""
    const types = await fetchClientTypes()
    clientTypes.value = Array.isArray(types) ? types : []
  } catch (error) {
    console.error("Не удалось получить типы клиентов", error)
    clientTypesError.value = "Не удалось загрузить типы клиентов"
    clientTypes.value = []
  } finally {
    clientTypesLoading.value = false
  }
}

const loadClient = async () => {
  if (!isEditMode.value || !props.clientId || !props.isOpen) {
    return
  }

  try {
    isClientLoading.value = true
    clientLoadError.value = ""
    const response = await fetchIndividualById(props.clientId)
    const payload = response?.data ?? response ?? {}
    applyClientData(payload)
  } catch (error) {
    console.error("Не удалось получить клиента", error)
    clientLoadError.value = "Не удалось загрузить данные клиента"
  } finally {
    isClientLoading.value = false
  }
}

const handleClickOutside = () => {
  if (!confirm("Вы уверены, что хотите закрыть окно?")) {
    return
  }
  handleClose()
}

onMounted(() => {
  loadClientTypes()
  if (isEditMode.value && props.isOpen) {
    loadClient()
  }
})

watch(
  () => props.initialData,
  (value) => {
    if (value && isEditMode.value && props.isOpen) {
      applyClientData(value)
    }
  }
)

watch(
  () => props.clientId,
  () => {
    if (!props.isOpen) {
      return
    }

    if (isEditMode.value) {
      if (props.initialData) {
        applyClientData(props.initialData)
      }
      loadClient()
    } else {
      resetForm()
    }
  }
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      invalidFields.value = new Set()
      if (isEditMode.value) {
        if (props.initialData) {
          applyClientData(props.initialData)
        }
        loadClient()
      } else {
        resetForm()
      }

      if (!clientTypes.value.length && !clientTypesLoading.value) {
        loadClientTypes()
      }
      return
    }

    clientLoadError.value = ""

    if (!isEditMode.value) {
      resetForm()
    }
  }
)
</script>
<template>
  <Teleport to="body">
    <div
      v-if="props.isOpen"
      class="modal fade show d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="createIndividualModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="createIndividualModalTitle" class="modal-title">
              {{ isEditMode ? "Редактирование клиента" : "Создание клиента" }}
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Закрыть"
              @click="handleClose"
            ></button>
          </div>
          <div class="modal-body" @click.stop>
            <div
              v-if="isClientLoading"
              class="d-flex align-items-center text-success gap-2 mb-2"
            >
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span class="small">Загрузка данных клиента...</span>
            </div>
            <p v-if="clientLoadError" class="text-danger small mb-3">
              {{ clientLoadError }}
            </p>
            <form class="row g-3" @submit.prevent="handleSubmit">
              <div class="col-md-6">
                <MaterialInput
                  id="individual-name"
                  v-model:value="formState.name"
                  label="ФИО"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('name')"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-phone"
                  v-model:value="formState.phone"
                  label="Телефон"
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('phone')"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-email"
                  v-model:value="formState.email"
                  label="E-mail"
                  type="email"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-social"
                  v-model:value="formState.social"
                  label="Социальная сеть"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-messenger"
                  v-model:value="formState.messenger"
                  label="Мессенджер"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-personal-sale"
                  v-model:value="formState.personal_sale"
                  label="Персональная скидка"
                  type="number"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-passport-serial"
                  v-model:value="formState.passport_serial"
                  label="Серия паспорта"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-passport-number"
                  v-model:value="formState.passport_number"
                  label="Номер паспорта"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-date-of-passport"
                  v-model:value="formState.date_of_passport"
                  label="Дата выдачи паспорта"
                  type="date"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-issued-by"
                  v-model:value="formState.issued_by"
                  label="Кем выдан"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-birthday"
                  v-model:value="formState.birthday"
                  label="Дата рождения"
                  type="date"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-registration"
                  v-model:value="formState.registration"
                  label="Адрес регистрации"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="individual-address"
                  v-model:value="formState.address"
                  label="Адрес проживания"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <div
                  class="input-group input-group-static"
                  :class="{
                    'is-filled': Boolean(formState.client_type_id),
                    'is-invalid': invalidFields.has('client_type_id'),
                  }"
                >
                  <select
                    id="individual-client-type"
                    :class="[
                      'form-select',
                      invalidFields.has('client_type_id') ? 'is-invalid' : '',
                    ]"
                    v-model="formState.client_type_id"
                    :disabled="clientTypesLoading || isFormDisabled"
                    required
                    aria-label="Тип клиента"
                  >
                    <option disabled value="">
                      {{ clientTypesLoading ? "Загрузка..." : "Выберите тип" }}
                    </option>
                    <option
                      v-for="type in clientTypes"
                      :key="type.id"
                      :value="type.id"
                    >
                      {{ type.title }}
                    </option>
                  </select>
                </div>
                <p v-if="clientTypesError" class="text-danger small mt-1 mb-0">
                  {{ clientTypesError }}
                </p>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <MaterialButton
              color="secondary"
              variant="outline"
              @click="handleClose"
            >
              Закрыть
            </MaterialButton>
            <MaterialButton
              color="success"
              :fullWidth="false"
              @click="handleSubmit"
              :active="props.isSaving || isClientLoading"
              :disabled="isFormDisabled"
            >
              {{ isEditMode ? "Сохранить" : "Создать" }}
            </MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="handleClickOutside"></div>
    </div>
  </Teleport>
</template>
