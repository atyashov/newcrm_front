<script setup>
import { Teleport, reactive, ref, watch, onMounted, computed } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchClientTypes } from "@/services/clientTypesService"
import { fetchLegalEntityById } from "@/services/legalEntitiesService"

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
  contact_name: "",
  organization_name: "",
  mobile_phone: "",
  phone: "",
  email: "",
  social: "",
  messenger: "",
  personal_sale: "",
  additional_phone: "",
  client_type_id: "",
  tin: "",
  cpr: "",
  bank_name: "",
  bik: "",
  k_s: "",
  r_s: "",
  legal_address: "",
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
    contact_name: payload.contact_name ?? "",
    organization_name: payload.organization_name ?? "",
    mobile_phone: payload.mobile_phone ?? "",
    phone: payload.phone ?? "",
    email: payload.email ?? "",
    social: payload.social ?? "",
    messenger: payload.messenger ?? "",
    personal_sale: payload.personal_sale ?? "",
    additional_phone: payload.additional_phone ?? "",
    client_type_id:
      payload.client_type_id ??
      (typeof clientType === "object" ? clientType.id ?? "" : clientType ?? ""),
    tin: payload.tin ?? "",
    cpr: payload.cpr ?? "",
    bank_name: payload.bank_name ?? "",
    bik: payload.bik ?? "",
    k_s: payload.k_s ?? "",
    r_s: payload.r_s ?? "",
    legal_address: payload.legal_address ?? "",
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

const requiredFields = [
  "contact_name",
  "organization_name",
  "phone",
  "client_type_id",
]

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
    const response = await fetchLegalEntityById(props.clientId)
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
      aria-labelledby="createLegalEntityModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="createLegalEntityModalTitle" class="modal-title">
              {{
                isEditMode
                  ? "Редактирование юридического лица"
                  : "Создание юридического лица"
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
                  id="legal-entity-contact-name"
                  v-model:value="formState.contact_name"
                  label="Контактное лицо"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('contact_name')"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-organization-name"
                  v-model:value="formState.organization_name"
                  label="Название организации"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('organization_name')"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-mobile-phone"
                  v-model:value="formState.mobile_phone"
                  label="Мобильный телефон"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-phone"
                  v-model:value="formState.phone"
                  label="Телефон"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('phone')"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-additional-phone"
                  v-model:value="formState.additional_phone"
                  label="Дополнительный телефон"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-email"
                  v-model:value="formState.email"
                  label="E-mail"
                  type="email"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-social"
                  v-model:value="formState.social"
                  label="Социальная сеть"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-messenger"
                  v-model:value="formState.messenger"
                  label="Мессенджер"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-personal-sale"
                  v-model:value="formState.personal_sale"
                  label="Персональная скидка"
                  type="number"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-tin"
                  v-model:value="formState.tin"
                  label="ИНН"
                  type="number"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-cpr"
                  v-model:value="formState.cpr"
                  label="КПП"
                  type="number"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-bank-name"
                  v-model:value="formState.bank_name"
                  label="Название банка"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-bik"
                  v-model:value="formState.bik"
                  label="БИК"
                  type="number"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-k-s"
                  v-model:value="formState.k_s"
                  label="Корр. счёт"
                  type="number"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="legal-entity-r-s"
                  v-model:value="formState.r_s"
                  label="Расчётный счёт"
                  type="number"
                  :disabled="isFormDisabled"
                />
              </div>
              <div class="col-md-12">
                <MaterialInput
                  id="legal-entity-legal-address"
                  v-model:value="formState.legal_address"
                  label="Юридический адрес"
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
                    id="legal-entity-client-type"
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
                      {{ type.name || type.title || type.label }}
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
