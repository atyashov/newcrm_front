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

// Products and categories currently use the legacy pageSize query parameter.
const listParams = (params = {}) => {
  const { page_size, per_page, pageSize, ...rest } = params
  return { ...rest, pageSize: Number(page_size ?? per_page ?? pageSize) || 20 }
}

export const fetchProducts = async (params) => {
  const response = await apiGet("admin/products", listParams(params))

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
      from: items.from ?? null,
      to: items.to ?? null,
      prev_page_url: items.prev_page_url ?? emptyPagination.prev_page_url,
      next_page_url: items.next_page_url ?? emptyPagination.next_page_url,
      links: items.links ?? emptyPagination.links,
    },
  }
}

export const fetchProductsFromSite = async (params) =>
  apiGet("admin/products/simple", params)

export const fetchProductAvailability = (params) =>
  apiPost("admin/products/availability", params, { notify: false })

export const fetchProductById = async (id, params = null) => {
  const response = params
    ? await apiGet(`admin/products/${id}`, params)
    : await apiGet(`admin/products/${id}`)

  if (response?.status === true) {
    return response.data?.item ?? {}
  }

  return {}
}

export const createProduct = async (payload) =>
  apiPost("admin/products", payload)

export const updateProduct = async (id, payload) =>
  apiPut(`admin/products/${id}`, payload)

export const fetchCategories = async (params) => {
  const query = listParams(params)
  const response = await apiGet("admin/categories", query)
  const fallbackPerPage = query.pageSize

  if (response?.status !== true) {
    return {
      data: [],
      pagination: {
        ...emptyPagination,
        per_page: fallbackPerPage,
      },
    }
  }

  const items = response.data?.items ?? []
  const isPaginatedItems =
    items !== null && typeof items === "object" && !Array.isArray(items)
  const data = Array.isArray(items) ? items : items.data ?? []

  return {
    data,
    pagination: {
      current_page: isPaginatedItems
        ? items.current_page ?? emptyPagination.current_page
        : emptyPagination.current_page,
      last_page: isPaginatedItems
        ? items.last_page ?? emptyPagination.last_page
        : emptyPagination.last_page,
      per_page: isPaginatedItems
        ? items.per_page ?? fallbackPerPage
        : fallbackPerPage,
      total: isPaginatedItems ? items.total ?? data.length : data.length,
      from: isPaginatedItems ? items.from ?? null : null,
      to: isPaginatedItems ? items.to ?? null : null,
      prev_page_url: isPaginatedItems
        ? items.prev_page_url ?? emptyPagination.prev_page_url
        : emptyPagination.prev_page_url,
      next_page_url: isPaginatedItems
        ? items.next_page_url ?? emptyPagination.next_page_url
        : emptyPagination.next_page_url,
      links: isPaginatedItems ? items.links ?? emptyPagination.links : [],
    },
  }
}

export const fetchCategoryById = async (id, params = null) => {
  const response = params
    ? await apiGet(`admin/categories/${id}`, params)
    : await apiGet(`admin/categories/${id}`)

  if (response?.status === true) {
    return response.data?.item ?? {}
  }

  return {}
}

export const createCategory = async (payload) => {
  return apiPost("admin/categories", payload)
}

export const updateCategory = async (id, payload) => {
  return apiPut(`admin/categories/${id}`, payload)
}
