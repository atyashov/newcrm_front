import { apiGet, apiPost, apiPut, apiDelete } from "@/api"
import { directoryList } from "@/utils/directoryList"

export const fetchUsers = async (params = {}) => {
  const response = await apiGet("admin/users", params)
  if (response?.status !== true) throw new Error(response?.message || "Не удалось загрузить пользователей.")
  return directoryList(response.data?.items ?? [], params)
}
export const fetchUserById = async (id) => {
  const response = await apiGet(`admin/users/${id}`)
  if (response?.status !== true) throw new Error(response?.message || "Не удалось загрузить пользователя.")
  return response.data?.item ?? {}
}
export const createUser = (payload) => apiPost("admin/users", payload)
export const updateUser = (id, payload) => apiPut(`admin/users/${id}`, payload)
export const deleteUser = (id) => apiDelete(`admin/users/${id}`)
