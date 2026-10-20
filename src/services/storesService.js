import { apiGet, apiPost, apiPut, apiDelete } from "@/api"

export const fetchStores = async (params = {}) => {
  const response = await apiGet("admin/stores", params)
  if (response?.status !== true) throw new Error(response?.message || "Не удалось загрузить склады.")
  const items = response.data?.items ?? {}
  return {
    data: Array.isArray(items) ? items : items.data ?? [],
    pagination: Array.isArray(items)
      ? { current_page: 1, last_page: 1, per_page: items.length, total: items.length }
      : items,
  }
}

export const fetchStoreById = async (id) => {
  const response = await apiGet(`admin/stores/${id}`)
  if (response?.status !== true) throw new Error(response?.message || "Не удалось загрузить склад.")
  return response.data?.item ?? {}
}

export const fetchAllStores = async () => {
  const stores = []
  let page = 1
  let lastPage = 1
  do {
    const result = await fetchStores({ page, page_size: 100, sort: "title" })
    stores.push(...result.data)
    lastPage = Number(result.pagination.last_page) || 1
    page += 1
  } while (page <= lastPage)
  return stores
}

export const createStore = (payload) => apiPost("admin/stores", payload)
export const updateStore = (id, payload) => apiPut(`admin/stores/${id}`, payload)
export const deleteStore = (id) => apiDelete(`admin/stores/${id}`)
