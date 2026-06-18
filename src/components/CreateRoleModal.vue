<script setup>
import { Teleport, reactive, ref, watch, onMounted, computed } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchRoleById } from "@/services/rolesService"
import { fetchPerms } from "@/services/permsService"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  roleId: {
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
  alias: "",
  perms: [],
}

const formState = reactive({ ...initialState })
const availablePerms = ref([])
const roleLoadError = ref("")
const permsLoadError = ref("")
const isRoleLoading = ref(false)
const isPermsLoading = ref(false)
const invalidFields = ref(new Set())
const isEditMode = computed(
  () => props.roleId !== null && props.roleId !== undefined
)

const isFormDisabled = computed(() => props.isSaving || isRoleLoading.value)

const getPermKey = (perm) => perm?.id ?? perm?.alias ?? perm?.name ?? ""

const normalizeRole = (rawPayload = {}) => {
  const payloadArray = Array.isArray(rawPayload?.item)
    ? rawPayload.item
    : Array.isArray(rawPayload)
    ? rawPayload
    : []
  const payload =
    payloadArray.length > 0 ? payloadArray[0] : rawPayload?.item ?? rawPayload

  const payloadPerms = Array.isArray(payload?.perms)
    ? payload.perms.map(getPermKey).filter(Boolean)
    : []

  return {
    title: payload?.title ?? "",
    alias: payload?.alias ?? "",
    perms: payloadPerms,
  }
}

const applyRoleData = (payload = {}) => {
  const normalized = normalizeRole(payload)
  Object.assign(formState, normalized)
}

const resetForm = () => {
  Object.assign(formState, initialState)
  invalidFields.value = new Set()
}

const handleClose = () => {
  emit("close")
  resetForm()
  roleLoadError.value = ""
}

const requiredFields = ["title", "alias", "perms"]

const isFieldEmpty = (value) => {
  if (Array.isArray(value)) {
    return value.length === 0
  }

  return value === null || value === undefined || String(value).trim() === ""
}

const handleSubmit = () => {
  if (isFormDisabled.value) {
    return
  }

  const missingFields = requiredFields.filter((key) => {
    const value = formState[key]
    return isFieldEmpty(value)
  })

  if (missingFields.length) {
    invalidFields.value = new Set(missingFields)
    return
  }

  invalidFields.value = new Set()

  emit("submit", {
    mode: isEditMode.value ? "edit" : "create",
    id: isEditMode.value ? props.roleId : null,
    payload: { ...formState },
  })
}

const loadRole = async () => {
  if (!isEditMode.value || !props.roleId || !props.isOpen) {
    return
  }

  try {
    isRoleLoading.value = true
    roleLoadError.value = ""
    const response = await fetchRoleById(props.roleId)
    const payload = response?.data ?? response ?? {}
    applyRoleData(payload)
  } catch (error) {
    console.error("Не удалось получить роль", error)
    roleLoadError.value = "Не удалось загрузить данные роли"
  } finally {
    isRoleLoading.value = false
  }
}

const loadPerms = async () => {
  try {
    isPermsLoading.value = true
    permsLoadError.value = ""
    const response = await fetchPerms()
    const items = response?.data?.items ?? response?.data ?? []
    availablePerms.value = items
      .map((perm) => ({
        ...perm,
        key: getPermKey(perm),
      }))
      .filter((perm) => Boolean(perm.key))
  } catch (error) {
    console.error("Не удалось получить привилегии", error)
    permsLoadError.value = "не удалось загрузить привилегии"
  } finally {
    isPermsLoading.value = false
  }
}

const handleTogglePerm = (key) => {
  const current = new Set(formState.perms ?? [])

  if (current.has(key)) {
    current.delete(key)
  } else {
    current.add(key)
  }

  formState.perms = Array.from(current)
}

const handleClickOutside = () => {
  if (!confirm("Вы уверены, что хотите закрыть окно?")) {
    return
  }
  handleClose()
}

onMounted(() => {
  if (isEditMode.value && props.isOpen) {
    loadRole()
  }
  loadPerms()
})

watch(
  () => props.initialData,
  (value) => {
    if (value && isEditMode.value && props.isOpen) {
      applyRoleData(value)
    }
  }
)

watch(
  () => props.roleId,
  () => {
    if (!props.isOpen) {
      return
    }

    if (isEditMode.value) {
      if (props.initialData) {
        applyRoleData(props.initialData)
      }
      loadRole()
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
          applyRoleData(props.initialData)
        }
        loadRole()
      } else {
        resetForm()
      }
      return
    }

    roleLoadError.value = ""

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
      aria-labelledby="createRoleModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="createIndividualModalTitle" class="modal-title">
              {{ isEditMode ? "Редактирование роли" : "Создание роли" }}
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
              v-if="isRoleLoading"
              class="d-flex align-items-center text-success gap-2 mb-2"
            >
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span class="small">Загрузка данных роли...</span>
            </div>
            <p v-if="roleLoadError" class="text-danger small mb-3">
              {{ roleLoadError }}
            </p>
            <form class="row g-3" @submit.prevent="handleSubmit">
              <div class="col-md-6">
                <MaterialInput
                  id="role-title"
                  v-model:value="formState.title"
                  label="Название"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('title')"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="role-alias"
                  v-model:value="formState.alias"
                  label="Алиас"
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('alias')"
                />
              </div>
              <div class="col-12">
                <label class="form-label mb-2 d-flex align-items-center gap-2">
                  Привилегии
                  <span
                    v-if="isPermsLoading"
                    class="spinner-border spinner-border-sm text-success"
                    role="status"
                    aria-hidden="true"
                  ></span>
                </label>
                <p v-if="permsLoadError" class="text-danger small mb-2">
                  {{ permsLoadError }}
                </p>
                <div
                  v-else
                  class="d-flex flex-column gap-2 border rounded p-3"
                  role="group"
                  aria-label="Список привилегий"
                >
                  <div
                    v-for="perm in availablePerms"
                    :key="perm.key"
                    class="form-check"
                  >
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="`perm-${perm.key}`"
                      :checked="formState.perms.includes(perm.key)"
                      :disabled="isFormDisabled || isPermsLoading"
                      @change="handleTogglePerm(perm.key)"
                    />
                    <label class="form-check-label" :for="`perm-${perm.key}`">
                      <strong>{{
                        perm.title ?? perm.name ?? perm.alias
                      }}</strong>
                      <template v-if="perm.description">
                        <span class="text-muted d-block small">
                          {{ perm.description }}
                        </span>
                      </template>
                    </label>
                  </div>
                  <p
                    v-if="!availablePerms.length && !isPermsLoading"
                    class="text-muted small mb-0"
                  >
                    Нет доступных привилегий.
                  </p>
                </div>
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
              :active="props.isSaving || isRoleLoading"
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
