import { apiGet, apiPost, apiPut } from "@/api"

const emptyPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 0,
  total: 0,
  prev_page_url: null,
  next_page_url: null,
  links: [],
}

export const fetchPaymentMethods = async (params = {}) => {
  const response = await apiGet("admin/payment-methods", params)

  if (response?.status !== true) {
    return {
      data: [],
      pagination: emptyPagination,
    }
  }

  const items = response.data?.items ?? {}
  const data = Array.isArray(items) ? items : items.data ?? []

  return {
    data,
    pagination: Array.isArray(items)
      ? {
          ...emptyPagination,
          per_page: data.length,
          total: data.length,
        }
      : {
          current_page: items.current_page ?? emptyPagination.current_page,
          last_page: items.last_page ?? emptyPagination.last_page,
          per_page: items.per_page ?? emptyPagination.per_page,
          total: items.total ?? emptyPagination.total,
          prev_page_url: items.prev_page_url ?? emptyPagination.prev_page_url,
          next_page_url: items.next_page_url ?? emptyPagination.next_page_url,
          links: items.links ?? emptyPagination.links,
        },
  }
}

export const fetchPaymentMethodById = async (id) => {
  const response = await apiGet(`admin/payment-methods/${id}`)

  if (response?.status === true) {
    return response.data?.item ?? {}
  }

  return {}
}

export const createPaymentMethod = async (payload) =>
  apiPost("admin/payment-methods", payload)

export const updatePaymentMethod = async (id, payload) =>
  apiPut(`admin/payment-methods/${id}`, payload)
