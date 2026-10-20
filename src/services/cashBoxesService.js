import { apiGet, apiPost, apiPut } from "@/api"

export const fetchCashBoxesSummary = async (params) => {
  const response = await apiGet("admin/cash-boxes/summary", params)
  if (response?.status !== true || !Array.isArray(response.data?.items) || !response.data?.totals) {
    throw new Error(response?.message || "Не удалось загрузить финансовый отчёт.")
  }
  return response.data
}

export const fetchCashBoxes = async (params = {}) => {
  const response = await apiGet("admin/cash-boxes", params)

  if (response?.status !== true) {
    return { data: [] }
  }

  const items = response.data?.items ?? []

  return {
    data: Array.isArray(items) ? items : items.data ?? [],
  }
}

export const fetchCashBoxById = async (id) => {
  const response = await apiGet(`admin/cash-boxes/${id}`)

  if (response?.status === true) {
    return response.data?.item ?? {}
  }

  return {}
}

export const createCashBox = async (payload) =>
  apiPost("admin/cash-boxes", payload)

export const updateCashBox = async (id, payload) =>
  apiPut(`admin/cash-boxes/${id}`, payload)
