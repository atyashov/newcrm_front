<script setup>
import { computed, ref, watch } from "vue"
import { useStore } from "vuex"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialCheckbox from "@/components/MaterialCheckbox.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import MaterialSelect from "@/components/MaterialSelect.vue"
import RichTextEditor from "@/components/RichTextEditor.vue"
import { fetchAllStores } from "@/services/storesService"
import {
  createProduct,
  fetchCategories,
  fetchProductsFromSite,
} from "@/services/productsService"

const props = defineProps({
  subdivisionId: {
    type: [Number, String, null],
    default: null,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["create-category"])

const store = useStore()

const productsList = ref([])
const page = ref(1)
const perPage = ref(100)
const isLoading = ref(false)
const requestError = ref("")
const hasLoaded = ref(false)
const onlyNew = ref(false)
const loadedOnlyNew = ref(false)
const hasMore = ref(false)
let requestVersion = 0
let loadedCount = 0
let savedCount = 0
const isSavingProducts = computed(() => productsList.value.some((product) => product.isSaving))
const stores = ref([])
const storeSelectOptions = computed(() => stores.value.map((entry) => ({ value: Number(entry.id), label: entry.title })))
const storesLoading = ref(false)
const storesError = ref("")
const loadStores = async () => {
  storesLoading.value = true
  storesError.value = ""
  try { stores.value = await fetchAllStores() }
  catch (error) { storesError.value = "Не удалось загрузить склады." }
  finally { storesLoading.value = false }
}

const currentSubdivision = computed(
  () => store.getters["subdivisions/currentSubdivision"] ?? null,
)

const siteUrl = computed(() => {
  const rawSite = currentSubdivision.value?.site_link

  if (!rawSite) {
    return ""
  }

  const normalizedSite = String(rawSite).trim().replace(/\/+$/, "")

  if (!normalizedSite) {
    return ""
  }

  if (/^https?:\/\//i.test(normalizedSite)) {
    return normalizedSite
  }

  return `https://${normalizedSite}`
})

const parseProducts = (payload) => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.products)) {
    return payload.products
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  return []
}

const normalizeInteger = (value, fallback = 0) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback
  }

  const normalized = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
  const parsed = Number.parseFloat(normalized)

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback
}

const normalizePrice = (value, fallback = 0) => {
  const normalized = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
  const parsed = Number.parseFloat(normalized)

  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback
}

const normalizeProducts = (items) =>
  items.map((product, index) => ({
    key: product.product_id ?? product.id ?? index,
    siteId: product.product_id ?? product.id ?? null,
    title: product.name ?? product.title ?? "",
    price: String(normalizePrice(product.price)),
    quantity: String(normalizeInteger(product.quantity, 1)),
    description: product.description ?? "",
    category: null,
    store_id: null,
    isSaving: false,
    isSaved: false,
    saveError: "",
    invalidFields: new Set(),
  }))

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

const validateProduct = (product) => {
  const invalidFields = new Set()

  if (!String(product.title ?? "").trim()) {
    invalidFields.add("title")
  }

  if (!product.category?.value) {
    invalidFields.add("category_id")
  }

  if (!String(product.price ?? "").trim()) {
    invalidFields.add("price")
  }

  if (!String(product.quantity ?? "").trim()) {
    invalidFields.add("quantity")
  }

  product.invalidFields = invalidFields
  return invalidFields.size === 0
}

const saveProduct = async (product) => {
  if (isLoading.value || product.isSaving || product.isSaved || !validateProduct(product)) {
    return
  }

  const version = requestVersion
  try {
    product.isSaving = true
    product.saveError = ""

    const response = await createProduct({
      subdivision_id: Number(props.subdivisionId),
      site_id: product.siteId,
      title: product.title.trim(),
      category_id: product.category.value,
      store_id: product.store_id === null ? null : Number(product.store_id),
      price: normalizePrice(product.price),
      quantity: normalizeInteger(product.quantity),
      description: product.description ?? "",
      status: 1,
      unlimited: false,
      is_rent: false,
      is_service: false,
    })

    product.isSaved = response?.status === true || response?.data?.status === true

    if (!product.isSaved) {
      product.saveError = "Не удалось создать товар."
    } else {
      if (version === requestVersion) savedCount += 1
      productsList.value = productsList.value.filter((item) => item !== product)
    }
  } catch (error) {
    console.error("Ошибка создания товара с сайта", error)
    product.saveError =
      error.response?.data?.message || "Не удалось создать товар."
  } finally {
    product.isSaving = false
  }
}

const fetchProducts = async (nextPage) => {
  const params = {
    subdivision_id: Number(props.subdivisionId),
    page: nextPage,
    per_page: perPage.value,
  }

  if (loadedOnlyNew.value) {
    params.only_new = 1
  }

  return fetchProductsFromSite(params)
}

const resetState = () => {
  requestVersion += 1
  isLoading.value = false
  page.value = 0
  hasMore.value = false
  loadedCount = 0
  savedCount = 0
  productsList.value = []
  requestError.value = ""
  hasLoaded.value = false
}

const loadProductsFromSite = async (append = false) => {
  if (!props.subdivisionId || isLoading.value || isSavingProducts.value) {
    return
  }

  const version = ++requestVersion
  const nextPage = append ? page.value + 1 : 1
  const previousOnlyNew = loadedOnlyNew.value
  if (!append) loadedOnlyNew.value = onlyNew.value
  // Saving removes rows from the backend's only_new result, shifting its offset.
  const offset = append ? loadedCount - (loadedOnlyNew.value ? savedCount : 0) : 0
  const firstPage = Math.floor(offset / perPage.value) + 1
  const skip = offset % perPage.value
  try {
    isLoading.value = true
    requestError.value = ""

    const responseData = await fetchProducts(firstPage)
    if (version !== requestVersion) return
    const firstItems = parseProducts(responseData)
    let items = firstItems.slice(skip)
    if (skip && firstItems.length === perPage.value) {
      const nextResponse = await fetchProducts(firstPage + 1)
      if (version !== requestVersion) return
      items = [...items, ...parseProducts(nextResponse)]
    }
    items = items.slice(0, perPage.value)
    const products = normalizeProducts(items)
    if (append) {
      const existing = new Set(productsList.value.map((item) => String(item.key)))
      productsList.value.push(...products.filter((item) => !existing.has(String(item.key))))
    } else {
      productsList.value = products
      loadedCount = 0
      savedCount = 0
    }
    loadedCount += items.length
    page.value = nextPage
    hasMore.value = items.length === perPage.value
    hasLoaded.value = true
  } catch (error) {
    if (version !== requestVersion) return
    loadedOnlyNew.value = previousOnlyNew
    console.error("Ошибка загрузки товаров с сайта", error)
    requestError.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Не удалось загрузить товары с сайта."
  } finally {
    if (version === requestVersion) isLoading.value = false
  }
}

const handleFetchProducts = async () => {
  loadStores()
  await loadProductsFromSite()
}

watch(
  () => props.isActive,
  (isActive) => {
    if (!isActive) {
      return
    }

    requestError.value = ""
  },
)

watch(
  () => props.subdivisionId,
  (newSubdivision, oldSubdivision) => {
    if (newSubdivision === oldSubdivision) {
      return
    }

    resetState()
  },
)

watch(
  () => currentSubdivision.value?.site_link,
  (newSite, oldSite) => {
    if (newSite === oldSite) {
      return
    }

    resetState()
  },
)
</script>

<template>
  <div>
    <p class="text-sm text-muted mb-3">
      Сайт подразделения:
      <span class="fw-semibold">{{ siteUrl || "не указан" }}</span>
    </p>

    <div class="d-flex flex-wrap align-items-center gap-3 mb-3">
      <MaterialButton
        type="button"
        color="success"
        :disabled="!props.subdivisionId || isLoading || isSavingProducts"
        @click="handleFetchProducts"
      >
        Получить товары
      </MaterialButton>

      <MaterialCheckbox
        id="only-new-products"
        v-model="onlyNew"
        name="only_new_products"
        :disabled="isLoading"
      >
        Только новые
      </MaterialCheckbox>
    </div>

    <div v-if="requestError" class="alert alert-danger" role="alert">
      {{ requestError }}
    </div>

    <div v-if="isLoading" class="text-center py-4">
      <span
        class="spinner-border text-success"
        role="status"
        aria-hidden="true"
      ></span>
    </div>

    <div>
      <p v-if="!productsList.length && !hasLoaded" class="text-muted">
        Нажмите "Получить товары", чтобы загрузить список с сайта.
      </p>

      <p v-else-if="!productsList.length" class="text-muted">
        Товары с сайта не найдены.
      </p>

      <div v-else>
        <article
          v-for="(product, index) in productsList"
          :key="product.key"
          class="card import-product-card mb-4"
          :class="{ 'border-success': product.isSaved }"
        >
          <div class="card-body">
            <div
              class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"
            >
              <p class="import-product-number mb-0">№{{ index + 1 }}</p>
              <span v-if="product.isSaved" class="text-success fw-semibold">
                Товар создан
              </span>
            </div>

            <div class="row g-3">
              <div class="col-lg-8">
                <MaterialInput
                  :id="`site-product-title-${product.key}`"
                  v-model:value="product.title"
                  label="Название"
                  :disabled="product.isSaving || product.isSaved"
                  :error="product.invalidFields.has('title')"
                />
              </div>

              <div class="col-sm-6 col-lg-2">
                <MaterialInput
                  :id="`site-product-price-${product.key}`"
                  v-model:value="product.price"
                  label="Цена"
                  type="number"
                  step="0.01"
                  :disabled="product.isSaving || product.isSaved"
                  :error="product.invalidFields.has('price')"
                />
              </div>

              <div class="col-sm-6 col-lg-2">
                <MaterialInput
                  :id="`site-product-quantity-${product.key}`"
                  v-model:value="product.quantity"
                  label="Количество"
                  type="number"
                  :disabled="product.isSaving || product.isSaved"
                  :error="product.invalidFields.has('quantity')"
                />
              </div>

              <div class="col-lg-8">
                <Multiselect
                  v-model="product.category"
                  placeholder="Категория"
                  :options="searchCategories"
                  :searchable="true"
                  :min-chars="3"
                  :delay="300"
                  :can-clear="true"
                  :can-deselect="true"
                  :filter-results="false"
                  :resolve-on-load="false"
                  :object="true"
                  value-prop="value"
                  label="label"
                  track-by="label"
                  no-options-text="Введите минимум 3 символа"
                  no-results-text="Ничего не найдено"
                  :disabled="product.isSaving || product.isSaved"
                  :class="{
                    'is-invalid': product.invalidFields.has('category_id'),
                  }"
                />
                <p
                  v-if="product.invalidFields.has('category_id')"
                  class="text-danger text-xs mt-1 mb-0"
                >
                  Выберите категорию.
                </p>
              </div>

              <div class="col-lg-4 d-flex align-items-start">
                <MaterialButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  :disabled="product.isSaving || product.isSaved"
                  @click="emit('create-category')"
                >
                  Создать категорию
                </MaterialButton>
              </div>

              <div class="col-lg-6">
                <MaterialSelect
                  :id="`site-product-store-${product.key}`"
                  v-model="product.store_id"
                  label="Склад"
                  placeholder="Без склада"
                  :options="storeSelectOptions"
                  :disabled="product.isSaving || product.isSaved || storesLoading || Boolean(storesError)"
                />
                <p v-if="storesError" class="text-warning text-xs mt-1">{{ storesError }} <button type="button" class="btn btn-link p-0 mb-0" @click="loadStores">Повторить</button></p>
              </div>
              <div class="col-12">
                <RichTextEditor
                  :id="`site-product-description-${product.key}`"
                  v-model="product.description"
                  name="description"
                  placeholder="Описание"
                  :disabled="product.isSaving || product.isSaved"
                />
              </div>
            </div>

            <p v-if="product.saveError" class="text-danger small mt-3 mb-0">
              {{ product.saveError }}
            </p>

            <div class="d-flex justify-content-end mt-3">
              <MaterialButton
                type="button"
                color="success"
                :disabled="isLoading || product.isSaving || product.isSaved"
                @click="saveProduct(product)"
              >
                {{ product.isSaving ? "Создание..." : "Создать товар" }}
              </MaterialButton>
            </div>
          </div>
        </article>
      </div>
      <MaterialButton
        v-if="hasLoaded && hasMore"
        type="button"
        color="success"
        :disabled="isLoading || isSavingProducts"
        @click="loadProductsFromSite(true)"
      >
        {{ isLoading ? "Загрузка..." : "Загрузить ещё 100 товаров" }}
      </MaterialButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.import-product-card {
  box-shadow: none;
}
.import-product-number {
  font-size: 0.75rem;
}
</style>
