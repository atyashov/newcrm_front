<script setup>
import { Teleport, reactive, ref, watch, onMounted, computed } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialCheckbox from "@/components/MaterialCheckbox.vue"
import { fetchPerms } from "../services/permsService"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  menu: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(["close", "submit"])

const perms = ref([])
const permsLoading = ref(false)
const permsError = ref("")
const menuLoadError = ref("")
const isMenuLoading = ref(false)
const isEditMode = computed(
  () => props.menu !== null && props.menu !== undefined,
)
const isFormDisabled = computed(() => props.isSaving || isMenuLoading.value)

const formState = reactive({
  perms: [],
})

const loadPerms = async () => {
  if (permsLoading.value) {
    return
  }

  try {
    permsLoading.value = true
    permsError.value = ""
    const response = await fetchPerms()
    const items = response?.data ?? []
    perms.value = Array.isArray(items) ? items : []
  } catch (error) {
    console.error("Не удалось получить привилегии", error)
    permsError.value = "Не удалось загрузить привилегии"
    perms.value = []
  } finally {
    permsLoading.value = false
  }
}

const applyMenuData = () => {
  const menuPerms = props.menu?.perms ?? []
  formState.perms = menuPerms.map((p) => p.id ?? p)
}

const resetForm = () => {
  formState.perms = []
}

const handleClose = () => {
  emit("close")
  resetForm()
  menuLoadError.value = ""
}

const handleSubmit = async () => {
  if (isFormDisabled.value) {
    return
  }

  // const permsString = formState.perms.join(",")

  try {
    emit("submit", {
      mode: isEditMode.value ? "edit" : "create",
      id: props.menu.id,
      payload: { perms: formState.perms },
    })
  } catch (error) {
    console.log("Ошибка при отправке формы", error)
  }
}

const handleCheckboxChange = (permId, isChecked) => {
  if (isChecked) {
    if (!formState.perms.includes(permId)) {
      formState.perms.push(permId)
    }
  } else {
    formState.perms = formState.perms.filter((id) => id !== permId)
  }
}

const isPermSelected = (permId) => {
  return formState.perms.includes(permId)
}

const handleClickOutside = () => {
  if (!confirm("Вы уверены, что хотите закрыть окно?")) {
    return
  }
  handleClose()
}

onMounted(() => {
  loadPerms()
  if (isEditMode.value && props.isOpen && props.menu) {
    applyMenuData()
  }
})

watch(
  () => props.menu,
  () => {
    if (!props.isOpen) {
      return
    }

    if (isEditMode.value) {
      if (props.menu) {
        applyMenuData()
      }
    } else {
      resetForm()
    }
  },
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      if (isEditMode.value) {
        if (props.menu) {
          applyMenuData()
        }
      } else {
        resetForm()
      }

      if (!perms.value.length && !permsLoading.value) {
        loadPerms()
      }
      return
    }

    menuLoadError.value = ""

    if (!isEditMode.value) {
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
      aria-labelledby="updateMenuAccessModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="updateMenuAccessModalTitle" class="modal-title">
              Доступ к разделу "{{ menu.title }}"
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
              v-if="permsLoading"
              class="d-flex align-items-center text-success gap-2 mb-2"
            >
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span class="small">Загрузка привилегий...</span>
            </div>
            <p v-if="permsError" class="text-danger small mb-3">
              {{ permsError }}
            </p>

            <form class="row g-3" @submit.prevent="handleSubmit">
              <div class="col-12">
                <label class="form-label fw-bold">Привилегии</label>
                <div
                  v-if="!permsLoading && !perms.length"
                  class="text-muted small"
                >
                  Привилегии не найдены
                </div>
                <div v-else class="container-fluid">
                  <div class="row">
                    <MaterialCheckbox
                      v-for="perm in perms"
                      :key="perm.id"
                      :id="'perm-' + perm.id"
                      :name="'perm-' + perm.id"
                      :checked="isPermSelected(perm.id)"
                      class="col-12 col-lg-4"
                      @change="
                        handleCheckboxChange(perm.id, $event.target.checked)
                      "
                    >
                      {{ perm.title }}
                    </MaterialCheckbox>
                  </div>
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
              :active="props.isSaving || isMenuLoading"
              :disabled="isFormDisabled"
            >
              Сохранить
            </MaterialButton>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade show" @click="handleClickOutside"></div>
    </div>
  </Teleport>
</template>
