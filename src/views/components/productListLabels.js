export const productCategoryTitle = (product, categories = []) => {
  if (Array.isArray(product.categories) && product.categories.length) {
    return product.categories.map((item) => item.title).filter(Boolean).join(", ") || "—"
  }
  return product.category?.title || product.category_title
    || categories.find((item) => String(item.id) === String(product.category_id))?.title || "—"
}

export const productStoreTitle = (product, stores = []) =>
  product.store?.title || product.store_title
  || stores.find((item) => String(item.id) === String(product.store_id))?.title
  || (product.store_id == null ? "Без склада" : `Склад №${product.store_id}`)
