import { apiGet, apiPost, apiPut } from "@/api"

const emptyPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
  links: [],
}

export const fetchExpenses = async (params = {}) => {
  const response = await apiGet("admin/expenses", params)

  if (response?.status !== true) {
    return { data: [], pagination: emptyPagination }
  }

  const items = response.data?.items ?? {}

  return {
    data: Array.isArray(items) ? items : items.data ?? [],
    pagination: Array.isArray(items)
      ? { ...emptyPagination, per_page: items.length, total: items.length }
      : {
          current_page: items.current_page ?? 1,
          last_page: items.last_page ?? 1,
          per_page: items.per_page ?? 20,
          total: items.total ?? 0,
          links: items.links ?? [],
        },
  }
}

export const fetchExpenseById = async (id) => {
  const response = await apiGet(`admin/expenses/${id}`)
  return response?.status === true ? response.data?.item ?? {} : {}
}

export const createExpense = async (payload) =>
  apiPost("admin/expenses", payload)

export const updateExpense = async (id, payload) =>
  apiPut(`admin/expenses/${id}`, payload)
