import { apiGet, apiPost, apiPut, apiDelete } from "@/api"

const endpoint = "admin/outlay-group-names"

export const fetchOutlayGroupNames = async (params) => {
  const response = await apiGet(endpoint, params)
  if (response?.status !== true) {
    throw new Error(response?.message || "Не удалось загрузить группы.")
  }
  const items = response.data?.items ?? {}
  return { data: items.data ?? [], pagination: items }
}

export const createOutlayGroupName = (payload) => apiPost(endpoint, payload)
export const updateOutlayGroupName = (id, payload) => apiPut(`${endpoint}/${id}`, payload)
export const deleteOutlayGroupName = (id, subdivisionId) =>
  apiDelete(`${endpoint}/${id}`, { params: { subdivision_id: subdivisionId } })
