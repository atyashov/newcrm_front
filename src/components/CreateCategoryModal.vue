<script setup>
import { Teleport, reactive, ref, watch, onMounted, computed } from "vue"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchCategories, fetchCategoryById } from "@/services/productsService"
import MaterialCheckbox from "./MaterialCheckbox.vue"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  categoryId: {
    type: [Number, String],
    default: null,
  },
  initialData: {
    type: Object,
    default: null,
  },
  subdivisionId: {
    type: [Number, String, null],
    default: null,
  },
})

const emit = defineEmits(["close", "submit"])

const initialState = {
  title: "",
  parent: null,
  status: true,
}

const formState = reactive({ ...initialState })
const categoryLoadError = ref("")
const isCategoryLoading = ref(false)
const invalidFields = ref(new Set())
const persistedParentId = ref(null)
const persistedParentLabel = ref("")
const isParentTouched = ref(false)
const isEditMode = computed(
  () => props.categoryId !== null && props.categoryId !== undefined,
)

const isFormDisabled = computed(() => props.isSaving || isCategoryLoading.value)
const parentPlaceholder = computed(
  () => persistedParentLabel.value || "Родительская категория",
)

const normalizeCategory = (rawPayload = {}) => {
  const payloadArray = Array.isArray(rawPayload?.item)
    ? rawPayload.item
    : Array.isArray(rawPayload)
    ? rawPayload
    : []
  const payload =
    payloadArray.length > 0 ? payloadArray[0] : rawPayload?.item ?? rawPayload

  return {
    title: payload?.title ?? "",
    parentId:
      payload?.parent_id ?? payload?.parent?.id ?? payload?.parent ?? null,
    parentLabel:
      payload?.parent_title ?? payload?.parent?.title ?? payload?.parent_name ?? "",
    status: Boolean(payload?.status),
  }
}

const applyCategoryData = (payload = {}) => {
  const normalized = normalizeCategory(payload)
  formState.title = normalized.title
  formState.parent = null
  formState.status = normalized.status
  persistedParentId.value = normalized.parentId
  persistedParentLabel.value = normalized.parentLabel
  isParentTouched.value = false
}

const hydrateParentLabel = async () => {
  const parentId = persistedParentId.value
  const parentLabel = persistedParentLabel.value

  if (!parentId || parentLabel) {
    return
  }

  try {
    const response = props.subdivisionId
      ? await fetchCategoryById(parentId, {
          subdivision_id: props.subdivisionId,
        })
      : await fetchCategoryById(parentId)

    const parentPayload = response?.data ?? response ?? {}
    const resolvedLabel =
      parentPayload?.title ??
      parentPayload?.name ??
      parentPayload?.item?.title ??
      null

    if (!resolvedLabel) {
      return
    }

    persistedParentLabel.value = resolvedLabel
  } catch (error) {
    console.error("Не удалось загрузить родительскую категорию", error)
  }
}

const resetForm = () => {
  Object.assign(formState, initialState)
  invalidFields.value = new Set()
  persistedParentId.value = null
  persistedParentLabel.value = ""
  isParentTouched.value = false
}

const handleClose = () => {
  emit("close")
  resetForm()
  categoryLoadError.value = ""
}

const requiredFields = ["title"]

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
    id: isEditMode.value ? props.categoryId : null,
    payload: {
      ...formState,
      parent: isParentTouched.value
        ? formState.parent?.value ?? null
        : persistedParentId.value ?? null,
    },
  })
}

const handleParentChange = (value) => {
  isParentTouched.value = true
  persistedParentId.value = value?.value ?? null
  persistedParentLabel.value = value?.label ?? ""
}

const searchParentCategories = async (query) => {
  if (!props.subdivisionId || !query || query.trim().length < 3) {
    return []
  }

  try {
    const response = await fetchCategories({
      page: 1,
      page_size: 50,
      subdivision_id: props.subdivisionId,
      title: query.trim(),
    })

    const items = Array.isArray(response?.data) ? response.data : []
    return items
      .filter((item) => item?.id !== props.categoryId)
      .map((item) => ({
        value: item.id,
        label: item.title ?? "Без названия",
      }))
  } catch (error) {
    console.error("Не удалось загрузить список категорий", error)
    return []
  }
}

const loadCategory = async () => {
  if (!isEditMode.value || !props.categoryId || !props.isOpen) {
    return
  }

  try {
    isCategoryLoading.value = true
    categoryLoadError.value = ""
    const response = props.subdivisionId
      ? await fetchCategoryById(props.categoryId, {
          subdivision_id: props.subdivisionId,
        })
      : await fetchCategoryById(props.categoryId)
    const payload = response?.data ?? response ?? {}
    applyCategoryData(payload)
    await hydrateParentLabel()
  } catch (error) {
    console.error("Не удалось получить категорию", error)
    categoryLoadError.value = "Не удалось загрузить данные"
  } finally {
    isCategoryLoading.value = false
  }
}

const handleClickOutside = () => {
  if (!confirm("Вы уверены, что хотите закрыть окно?")) {
    return
  }
  handleClose()
}

onMounted(() => {
  if (isEditMode.value && props.isOpen) {
    loadCategory()
  }
})

watch(
  () => props.initialData,
  (value) => {
    if (value && isEditMode.value && props.isOpen) {
      applyCategoryData(value)
    }
  },
)

watch(
  () => props.categoryId,
  () => {
    if (!props.isOpen) {
      return
    }

    if (isEditMode.value) {
      if (props.initialData) {
        applyCategoryData(props.initialData)
      }
      loadCategory()
    } else {
      resetForm()
    }
  },
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      invalidFields.value = new Set()
      if (isEditMode.value) {
        if (props.initialData) {
          applyCategoryData(props.initialData)
        }
        loadCategory()
      } else {
        resetForm()
      }
      return
    }

    categoryLoadError.value = ""

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
      aria-labelledby="createCategoryModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="createCategoryModalTitle" class="modal-title">
              {{
                isEditMode ? "Редактирование категории" : "Создание категории"
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
              v-if="isCategoryLoading"
              class="d-flex align-items-center text-success gap-2 mb-2"
            >
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span class="small">Загрузка данных категории...</span>
            </div>
            <p v-if="categoryLoadError" class="text-danger small mb-3">
              {{ categoryLoadError }}
            </p>
            <form class="row g-3" @submit.prevent="handleSubmit">
              <div class="col-md-6">
                <MaterialInput
                  id="category-title"
                  v-model:value="formState.title"
                  label="Название"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('title')"
                />
              </div>
              <div class="col-md-6">
                <Multiselect
                  v-model="formState.parent"
                  :placeholder="parentPlaceholder"
                  :options="searchParentCategories"
                  :searchable="true"
                  :min-chars="3"
                  :delay="300"
                  :can-clear="true"
                  :can-deselect="true"
                  :filter-results="false"
                  :resolve-on-load="false"
                  :allow-absent="true"
                  value-prop="value"
                  label="label"
                  track-by="label"
                  :object="true"
                  no-options-text="Введите минимум 3 символа"
                  no-results-text="Ничего не найдено"
                  :disabled="isFormDisabled"
                  @change="handleParentChange"
                />
              </div>
              <div class="col-md-6">
                <MaterialCheckbox
                  v-model="formState.status"
                  name="status"
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('parent')"
                  >Активна
                </MaterialCheckbox>
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
              :active="props.isSaving || isCategoryLoading"
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
