import { apiDelete, apiGet, apiPost, apiPut } from "@/api"

const pagination = (page, perPage, total) => ({
  current_page: page,
  last_page: Math.max(1, Math.ceil(total / perPage)),
  per_page: perPage,
  total,
  links: [],
})

const compare = (left, right, field) => {
  const a = left?.[field]
  const b = right?.[field]

  if (typeof a === "string" || typeof b === "string") {
    return String(a ?? "").localeCompare(String(b ?? ""), "ru", {
      sensitivity: "base",
    })
  }

  return Number(a ?? 0) - Number(b ?? 0)
}

export const fetchOutlayStatuses = async (params = {}) => {
  const response = await apiGet("admin/statuses")
  if (response?.status !== true) {
    return { data: [], pagination: pagination(1, 20, 0) }
  }

  let items = Array.isArray(response.data?.items) ? response.data.items : []
  if (params.subdivision_id !== undefined && params.subdivision_id !== null) {
    items = items.filter((item) =>
      String(item.subdivision_id) === String(params.subdivision_id),
    )
  }
  if (params.title) {
    const title = String(params.title).toLocaleLowerCase("ru")
    items = items.filter((item) =>
      String(item.title ?? "").toLocaleLowerCase("ru").includes(title),
    )
  }
  if (params.sort_order !== undefined && params.sort_order !== "") {
    items = items.filter((item) =>
      Number(item.sort_order) === Number(params.sort_order),
    )
  }
  if (params.affects_stock !== undefined && params.affects_stock !== "") {
    const affectsStock = String(params.affects_stock) === "1"
    items = items.filter((item) => Boolean(item.affects_stock) === affectsStock)
  }

  const descending = String(params.sort ?? "-sort_order").startsWith("-")
  const field = String(params.sort ?? "-sort_order").replace(/^-/, "")
  items.sort((a, b) => (descending ? -1 : 1) * compare(a, b, field))

  const page = Math.max(1, Number(params.page) || 1)
  const perPage = Math.max(1, Number(params.page_size) || 20)
  const total = items.length
  const offset = (page - 1) * perPage

  return {
    data: items.slice(offset, offset + perPage),
    pagination: pagination(page, perPage, total),
  }
}

export const fetchOutlayStatusById = async (id) => {
  const response = await apiGet(`admin/statuses/${id}`)
  return response?.status === true ? response.data?.item ?? {} : {}
}

export const createOutlayStatus = (payload) =>
  apiPost("admin/statuses", payload)

export const updateOutlayStatus = (id, payload) =>
  apiPut(`admin/statuses/${id}`, payload)

export const deleteOutlayStatus = (id) =>
  apiDelete(`admin/statuses/${id}`)
