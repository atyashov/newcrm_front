import { apiGet, apiPost, apiPut } from "@/api"

const emptyPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
  links: [],
}

export const fetchBorrowings = async (params = {}) => {
  const response = await apiGet("admin/borrowings", params)

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

export const fetchBorrowingById = async (id) => {
  const response = await apiGet(`admin/borrowings/${id}`)
  return response?.status === true ? response.data?.item ?? {} : {}
}

export const createBorrowing = async (payload) =>
  apiPost("admin/borrowings", payload)

export const updateBorrowing = async (id, payload) =>
  apiPut(`admin/borrowings/${id}`, payload)
