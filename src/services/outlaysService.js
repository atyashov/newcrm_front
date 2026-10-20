import { apiGet, apiPost, apiPut } from "@/api"
import { fetchOutlayStatuses } from "@/services/outlayStatusesService"
import { fetchUsers } from "@/services/usersService"
import { collectDirectoryPages } from "@/utils/directoryList"

const emptyPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
  links: [],
}

export const fetchOutlays = async (params = {}) => {
  const response = await apiPost("admin/outlays", params, { notify: false })
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
          total: items.total ?? null,
          from: items.from ?? null,
          to: items.to ?? null,
          links: items.links ?? [],
        },
  }
}

export const fetchOutlayById = async (id) => {
  const response = await apiGet(`admin/outlays/${id}`)
  return response?.status === true ? response.data?.item ?? {} : {}
}

export const createOutlay = async (payload) =>
  apiPost("admin/outlays/store", payload)

export const updateOutlay = async (id, payload) =>
  apiPut(`admin/outlays/${id}`, payload)

export const fetchUsersForOutlays = () => collectDirectoryPages(fetchUsers)

export const fetchStatusesForOutlays = async (params = {}) => {
  const response = await fetchOutlayStatuses({ ...params, page: 1, page_size: 1000 })
  return response.data
}
