<script setup>
import { reactive, ref, watch, onMounted, computed } from "vue"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import MaterialCheckbox from "./MaterialCheckbox.vue"
import MaterialTextarea from "./MaterialTextarea.vue"
import FileManagerModal from "@/components/FileManagerModal.vue"
import {
  fetchProductById,
  fetchCategories,
  fetchCategoryById,
} from "../services/productsService"

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  productId: {
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
  category_id: null,
  price: "",
  quantity: "",
  image: null,
  status: true,
  unlimited: false,
  is_rent: false,
  is_service: false,
  description: "",
}

const formState = reactive({ ...initialState })
const productLoadError = ref("")
const isProductLoading = ref(false)
const invalidFields = ref(new Set())
const persistedCategoryId = ref(null)
const persistedCategoryLabel = ref("")
const isCategoryTouched = ref(false)
const selectedImagePreview = ref("")
const selectedImageName = ref("")
const isFileManagerOpen = ref(false)

const isEditMode = computed(
  () => props.productId !== null && props.productId !== undefined,
)

const fileBaseUrl = process.env.VUE_APP_FILE_PATH

const isFormDisabled = computed(() => props.isSaving || isProductLoading.value)
const categoryPlaceholder = computed(
  () => persistedCategoryLabel.value || "Категория",
)
const imageButtonLabel = computed(() =>
  formState.image ? "Изменить изображение" : "Выбрать изображение",
)

const syncImageState = (rawImage) => {
  if (!rawImage) {
    formState.image = null
    selectedImagePreview.value = ""
    selectedImageName.value = ""
    return
  }

  const imageValue =
    typeof rawImage === "string"
      ? rawImage
      : rawImage?.path ?? rawImage?.url ?? rawImage?.preview_url ?? null

  const imageName =
    typeof rawImage === "string"
      ? rawImage.split("/").pop()
      : rawImage?.title ?? rawImage?.name ?? rawImage?.basename ?? imageValue

  const previewUrl =
    typeof rawImage === "string"
      ? rawImage
      : rawImage?.url ?? rawImage?.preview_url ?? rawImage?.thumbnail_url ?? ""

  formState.image = imageValue
  selectedImagePreview.value = previewUrl || ""
  selectedImageName.value = imageName || ""
}

const normalizeProduct = (rawPayload = {}) => {
  const payloadArray = Array.isArray(rawPayload?.item)
    ? rawPayload.item
    : Array.isArray(rawPayload)
    ? rawPayload
    : []
  const payload =
    payloadArray.length > 0 ? payloadArray[0] : rawPayload?.item ?? rawPayload

  return {
    title: payload?.title ?? "",
    categoryId:
      payload?.category_id ??
      payload?.category?.id ??
      payload?.category ??
      null,
    categoryLabel:
      payload?.category_title ??
      payload?.category?.title ??
      payload?.category_name ??
      "",
    price: payload?.price ?? "",
    quantity: payload?.quantity ?? payload?.count ?? "",
    image:
      payload?.image ??
      payload?.image_path ??
      payload?.image_url ??
      payload?.photo ??
      null,
    unlimited: Boolean(payload?.unlimited),
    is_rent: Boolean(payload?.is_rent),
    is_service: Boolean(payload?.is_service),
    description: payload?.description,
    status: Boolean(payload?.status),
  }
}

const applyProductData = (payload = {}) => {
  const normalized = normalizeProduct(payload)
  formState.title = normalized.title
  formState.category_id = null
  formState.price = normalized.price
  formState.quantity = normalized.quantity
  formState.status = normalized.status
  formState.unlimited = normalized.unlimited
  formState.is_rent = normalized.is_rent
  formState.is_service = normalized.is_service
  formState.description = normalized.description
  persistedCategoryId.value = normalized.categoryId
  persistedCategoryLabel.value = normalized.categoryLabel
  isCategoryTouched.value = false
  syncImageState(normalized.image)
}

const hydrateCategoryLabel = async () => {
  const categoryId = persistedCategoryId.value
  const categoryLabel = persistedCategoryLabel.value

  if (!categoryId || categoryLabel) {
    return
  }

  try {
    const response = props.subdivisionId
      ? await fetchCategoryById(categoryId, {
          subdivision_id: props.subdivisionId,
        })
      : await fetchCategoryById(categoryId)

    const resolvedLabel =
      response?.title ?? response?.name ?? response?.item?.title ?? null

    if (!resolvedLabel) {
      return
    }

    persistedCategoryLabel.value = resolvedLabel
  } catch (error) {
    console.error("Не удалось загрузить категорию", error)
  }
}

const resetForm = () => {
  Object.assign(formState, initialState)
  invalidFields.value = new Set()
  persistedCategoryId.value = null
  persistedCategoryLabel.value = ""
  isCategoryTouched.value = false
  productLoadError.value = ""
  isFileManagerOpen.value = false
  syncImageState(null)
}

const handleClose = () => {
  emit("close")
  resetForm()
}

const requiredFields = [
  "title",
  "category_id",
  "price",
  "quantity",
  "is_rent",
  "unlimited",
  "is_service",
]

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

  const payload = {
    ...formState,
    category_id: isCategoryTouched.value
      ? formState.category_id?.value ?? null
      : persistedCategoryId.value ?? null,
  }

  const missingFields = requiredFields.filter((key) =>
    isFieldEmpty(payload[key]),
  )

  if (missingFields.length) {
    invalidFields.value = new Set(missingFields)
    return
  }

  invalidFields.value = new Set()

  emit("submit", {
    mode: isEditMode.value ? "edit" : "create",
    id: isEditMode.value ? props.productId : null,
    payload,
  })
}

const handleCategoryChange = (value) => {
  isCategoryTouched.value = true
  persistedCategoryId.value = value?.value ?? null
  persistedCategoryLabel.value = value?.label ?? ""
}

const searchCategories = async (query) => {
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
    return items.map((item) => ({
      value: item.id,
      label: item.title ?? "Без названия",
    }))
  } catch (error) {
    console.error("Не удалось загрузить список категорий", error)
    return []
  }
}

const loadProduct = async () => {
  if (!isEditMode.value || !props.productId || !props.isOpen) {
    return
  }

  try {
    isProductLoading.value = true
    productLoadError.value = ""

    const response = props.subdivisionId
      ? await fetchProductById(props.productId, {
          subdivision_id: props.subdivisionId,
        })
      : await fetchProductById(props.productId)

    applyProductData(response ?? {})
    await hydrateCategoryLabel()
  } catch (error) {
    console.error("Не удалось получить товар", error)
    productLoadError.value = "Не удалось загрузить данные товара."
  } finally {
    isProductLoading.value = false
  }
}

const handleOpenFileManager = () => {
  if (isFormDisabled.value) {
    return
  }

  isFileManagerOpen.value = true
}

const handleCloseFileManager = () => {
  isFileManagerOpen.value = false
}

const handleSelectImage = (file) => {
  syncImageState(file)
  handleCloseFileManager()
}

const clearSelectedImage = () => {
  syncImageState(null)
}

const handleClickOutside = () => {
  if (!confirm("Вы уверены, что хотите закрыть окно?")) {
    return
  }
  handleClose()
}

onMounted(() => {
  if (isEditMode.value && props.isOpen) {
    loadProduct()
  }
})

watch(
  () => props.initialData,
  (value) => {
    if (value && isEditMode.value && props.isOpen) {
      applyProductData(value)
    }
  },
)

watch(
  () => props.productId,
  () => {
    if (!props.isOpen) {
      return
    }

    if (isEditMode.value) {
      if (props.initialData) {
        applyProductData(props.initialData)
      }
      loadProduct()
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
          applyProductData(props.initialData)
        }
        loadProduct()
      } else {
        resetForm()
      }
      return
    }

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
      aria-labelledby="createProductModalTitle"
      tabindex="-1"
      @keydown.esc="handleClose"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="createProductModalTitle" class="modal-title">
              {{ isEditMode ? "Редактирование товара" : "Создание товара" }}
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
              v-if="isProductLoading"
              class="d-flex align-items-center text-success gap-2 mb-2"
            >
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              <span class="small">Загрузка данных товара...</span>
            </div>
            <p v-if="productLoadError" class="text-danger small mb-3">
              {{ productLoadError }}
            </p>
            <form class="row g-3" @submit.prevent="handleSubmit">
              <div class="col-md-6">
                <MaterialInput
                  id="product-title"
                  v-model:value="formState.title"
                  label="Название"
                  isRequired
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('title')"
                />
              </div>
              <div class="col-md-6">
                <Multiselect
                  v-model="formState.category_id"
                  :placeholder="categoryPlaceholder"
                  :options="searchCategories"
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
                  @change="handleCategoryChange"
                />
                <p
                  v-if="invalidFields.has('category_id')"
                  class="text-danger text-xs mt-1 mb-0"
                >
                  Выберите категорию.
                </p>
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="product-price"
                  v-model:value="formState.price"
                  label="Цена"
                  :disabled="isFormDisabled"
                  type="number"
                  :error="invalidFields.has('price')"
                />
              </div>
              <div class="col-md-6">
                <MaterialInput
                  id="product-quantity"
                  v-model:value="formState.quantity"
                  label="Количество"
                  :disabled="isFormDisabled"
                  type="number"
                  :error="invalidFields.has('quantity')"
                />
              </div>

              <div class="col-md-4">
                <MaterialCheckbox
                  v-model="formState.unlimited"
                  name="unlimited"
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('unlimited')"
                  >Безлимитный
                </MaterialCheckbox>
              </div>

              <div class="col-md-4">
                <MaterialCheckbox
                  v-model="formState.is_rent"
                  name="is_rent"
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('is_rent')"
                  >Арендный
                </MaterialCheckbox>
              </div>

              <div class="col-md-4">
                <MaterialCheckbox
                  id="product-description"
                  v-model="formState.is_service"
                  name="is_service"
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('is_service')"
                  >Услуга
                </MaterialCheckbox>
              </div>
              <div class="col-md-12">
                <MaterialTextarea
                  v-model:value="formState.description"
                  name="description"
                  placeholder="Описание"
                  :disabled="isFormDisabled"
                  :error="invalidFields.has('description')"
                ></MaterialTextarea>
              </div>
              <div class="col-12">
                <div class="card border h-100">
                  <div
                    class="card-body d-flex flex-column flex-md-row gap-3 align-items-start"
                  >
                    <div class="flex-grow-1">
                      <p class="text-sm font-weight-bold mb-2">Изображение</p>
                      <div class="d-flex flex-wrap gap-2">
                        <MaterialButton
                          type="button"
                          color="info"
                          variant="outline"
                          :disabled="isFormDisabled"
                          @click="handleOpenFileManager"
                        >
                          {{ imageButtonLabel }}
                        </MaterialButton>
                        <MaterialButton
                          type="button"
                          v-if="formState.image"
                          color="secondary"
                          variant="outline"
                          :disabled="isFormDisabled"
                          @click="clearSelectedImage"
                        >
                          Очистить
                        </MaterialButton>
                      </div>
                      <p v-if="selectedImageName" class="text-sm mt-2 mb-0">
                        {{ selectedImageName }}
                      </p>
                    </div>
                    <div
                      v-if="selectedImagePreview"
                      class="product-image-preview img-thumbnail"
                    >
                      <img
                        :src="fileBaseUrl + '/images/' + selectedImagePreview"
                        :alt="selectedImageName || 'Изображение товара'"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <MaterialCheckbox
                  v-model="formState.status"
                  name="status"
                  :disabled="isFormDisabled"
                >
                  Активен
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
              :fullWidth="false"
              @click="handleSubmit"
              :active="props.isSaving || isProductLoading"
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

  <FileManagerModal
    :is-open="isFileManagerOpen"
    :subdivision-id="props.subdivisionId"
    @close="handleCloseFileManager"
    @select="handleSelectImage"
  />
</template>

<style scoped lang="scss">
.product-image-preview {
  width: 180px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 0.75rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
