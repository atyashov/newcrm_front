import { apiGet, apiPost, apiPut } from "@/api"

export const fetchExpenseGroups = async () => {
  const response = await apiGet("admin/expense-groups")

  if (response?.status !== true) {
    return {
      data: [],
    }
  }

  const items = response.data?.items ?? []

  return {
    data: Array.isArray(items) ? items : [],
  }
}

export const fetchExpenseGroupById = async (id) => {
  const response = await apiGet(`admin/expense-groups/${id}`)

  if (response?.status === true) {
    return response.data?.item ?? {}
  }

  return {}
}

export const createExpenseGroup = async (payload) =>
  apiPost("admin/expense-groups", payload)

export const updateExpenseGroup = async (id, payload) =>
  apiPut(`admin/expense-groups/${id}`, payload)
