<script setup>
import { computed, ref, useCssModule } from "vue"
import MaterialButton from "@/components/MaterialButton.vue"
import CreateCategoryModal from "@/components/CreateCategoryModal.vue"
import CreateProductModal from "../components/CreateProductModal.vue"
import ProductsTabs from "@/views/components/ProductsTabs.vue"
import CategoriesTabs from "@/views/components/CategoriesTabs.vue"
import FetchProductsFromSite from "./FetchProductsFromSite.vue"
import {
  createCategory,
  updateCategory,
  createProduct,
} from "@/services/productsService"
import { useModal } from "@/views/components/useModal"
import store from "@/store"
import { updateProduct } from "../services/productsService"

const styles = useCssModule()

const activeTab = ref("products")
const isCategorySaving = ref(false)
const categoriesTabRef = ref(null)
const isProductSaving = ref(false)
const productsTabRef = ref(null)

const subdivision = computed(() => store.state.subdivisions.currentId)

const {
  isOpen: isCreateProductModalVisible,
  editingId: editingProductId,
  editingData: editingProductSnapshot,
  open: openProductModal,
  close: closeProductModal,
} = useModal()

const handleOpenCreateProductModal = () => {
  openProductModal()
}

const handleCloseProductModal = () => {
  closeProductModal()
}

const handleEditProduct = (product) => {
  if (!product) {
    return
  }

  openProductModal(product.id ?? null, product)
}

const handleProductModalSubmit = async ({ mode, payload, id }) => {
  if (isProductSaving.value) {
    return
  }

  try {
    isProductSaving.value = true

    const requestPayload = {
      ...payload,
      subdivision_id: subdivision.value,
      status: payload.status ? 1 : 0,
    }

    const isEditMode = mode === "edit" && id
    const response = isEditMode
      ? await updateProduct(id, requestPayload)
      : await createProduct(requestPayload)
    const isSuccess =
      response?.status === true || response?.data?.status === true

    if (!isSuccess) {
      return
    }

    await productsTabRef.value?.refresh?.()
    handleCloseProductModal()
  } catch (error) {
    console.error("Ошибка при сохранении товара", error)
  } finally {
    isProductSaving.value = false
  }
}

const {
  isOpen: isCreateCategoryModalVisible,
  editingId: editingCategoryId,
  editingData: editingCategorySnapshot,
  open: openCategoryModal,
  close: closeCategoryModal,
} = useModal()

const handleOpenCreateCategoryModal = () => {
  openCategoryModal()
}

const handleCloseCategoryModal = () => {
  closeCategoryModal()
}

const handleEditCategory = (category) => {
  if (!category) {
    return
  }

  openCategoryModal(category.id ?? null, category)
}

const handleCategoryModalSubmit = async ({ mode, payload, id }) => {
  if (isCategorySaving.value) {
    return
  }

  try {
    isCategorySaving.value = true

    const requestPayload = {
      ...payload,
      subdivision_id: subdivision.value,
      status: payload.status ? 1 : 0,
    }

    const isEditMode = mode === "edit" && id
    const response = isEditMode
      ? await updateCategory(id, requestPayload)
      : await createCategory(requestPayload)
    const isSuccess =
      response?.status === true || response?.data?.status === true

    if (!isSuccess) {
      return
    }

    await categoriesTabRef.value?.refresh?.()
    await productsTabRef.value?.refresh?.()
    handleCloseCategoryModal()
  } catch (error) {
    console.error("Ошибка при сохранении категории", error)
  } finally {
    isCategorySaving.value = false
  }
}
</script>

<template>
  <section :class="styles.wrapper">
    <header :class="styles.header">
      <div>
        <h1 :class="styles.title">Товары</h1>
        <p :class="styles.subtitle">Управление товарами и категориями</p>
      </div>
      <div :class="styles.creatingButtons">
        <MaterialButton
          v-if="subdivision && activeTab === 'products'"
          color="success"
          @click="handleOpenCreateProductModal"
        >
          Создать товар
        </MaterialButton>
        <MaterialButton
          v-if="subdivision && activeTab === 'categories'"
          color="success"
          @click="handleOpenCreateCategoryModal"
        >
          Создать категорию
        </MaterialButton>
      </div>
    </header>

    <template v-if="!subdivision">
      <div class="alert alert-danger" role="alert">
        Подразделение не выбрано.
      </div>
    </template>
    <template v-else>
      <div class="tabs">
        <button
          type="button"
          :class="['tab', activeTab === 'products' ? 'tab-active' : '']"
          @click="activeTab = 'products'"
        >
          Товары
        </button>

        <button
          type="button"
          :class="['tab', activeTab === 'categories' ? 'tab-active' : '']"
          @click="activeTab = 'categories'"
        >
          Категории
        </button>
        <button
          type="button"
          :class="['tab', activeTab === 'website' ? 'tab-active' : '']"
          @click="activeTab = 'website'"
        >
          Загрузить с сайта
        </button>
      </div>

      <ProductsTabs
        v-show="activeTab === 'products'"
        ref="productsTabRef"
        :subdivision-id="subdivision"
        :is-active="activeTab === 'products'"
        @edit-product="handleEditProduct"
      />

      <CategoriesTabs
        v-show="activeTab === 'categories'"
        ref="categoriesTabRef"
        :subdivision-id="subdivision"
        :is-active="activeTab === 'categories'"
        @edit-category="handleEditCategory"
      />
      <FetchProductsFromSite
        v-show="activeTab === 'website'"
        :subdivision-id="subdivision"
        :is-active="activeTab === 'website'"
        @create-category="handleOpenCreateCategoryModal"
      />
    </template>

    <CreateProductModal
      :is-open="isCreateProductModalVisible"
      :is-saving="isProductSaving"
      :product-id="editingProductId"
      :initial-data="editingProductSnapshot"
      :subdivision-id="subdivision"
      @close="handleCloseProductModal"
      @submit="handleProductModalSubmit"
    />

    <CreateCategoryModal
      :is-open="isCreateCategoryModalVisible"
      :is-saving="isCategorySaving"
      :category-id="editingCategoryId"
      :initial-data="editingCategorySnapshot"
      :subdivision-id="subdivision"
      @close="handleCloseCategoryModal"
      @submit="handleCategoryModalSubmit"
    />
  </section>
</template>

<style module lang="scss">
.wrapper {
  padding: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #6c757d;
}

.creatingButtons {
  display: flex;
  gap: 10px;
}
</style>
