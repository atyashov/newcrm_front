import { apiGet, apiPost, apiPut, apiDelete } from "@/api"
import { directoryList, collectDirectoryPages } from "@/utils/directoryList"

export const fetchSubdivisionList = async (params = {}) => {
  const response = await apiGet("admin/subdivisions", params)
  if (response?.status !== true) {
    throw new Error(response?.message || "Не удалось загрузить подразделения.")
  }

  return directoryList(response.data?.items ?? [], params)
}

// The header and access selectors need every available subdivision, not just the first page.
export const fetchSubdivisions = async (params = {}) => ({
  data: await collectDirectoryPages(fetchSubdivisionList, params),
})
export const fetchSubdivisionById = async (id) => {
  const response = await apiGet(`admin/subdivisions/${id}`)
  if (response?.status !== true) throw new Error(response?.message || "Не удалось загрузить подразделение.")
  return response.data?.item ?? {}
}
export const createSubdivision = (payload) => apiPost("admin/subdivisions", payload)
export const updateSubdivision = (id, payload) => apiPut(`admin/subdivisions/${id}`, payload)
export const deleteSubdivision = (id) => apiDelete(`admin/subdivisions/${id}`)
