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

export const fetchRoles = async (params = {}) => {
  const response = await apiGet("admin/roles", params)

  if (response?.status !== true) {
    return {
      data: [],
      pagination: emptyPagination,
    }
  }

  const items = response.data?.items ?? {}

  return {
    data: items.data ?? [],
    pagination: {
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

export const fetchRoleById = async (id) => {
  const response = await apiGet(`admin/roles/${id}`)

  if (response?.status === true) {
    const item = response.data?.item
    if (Array.isArray(item)) {
      return item
    }
    return item ?? {}
  }

  return {}
}

export const createRole = async (payload) => apiPost("admin/roles", payload)

export const updateRole = async (id, payload) =>
  apiPut(`admin/roles/${id}`, payload)
