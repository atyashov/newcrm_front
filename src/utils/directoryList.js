// Legacy endpoints return complete arrays; paginated responses are already processed by the server.
export const directoryList = (items, params = {}) => {
  if (!Array.isArray(items)) return { data: items?.data ?? [], pagination: items ?? {} }
  let rows = items.filter((item) => Object.entries(params).every(([key, value]) => {
    if (["page", "page_size", "per_page", "sort"].includes(key) || value == null || value === "") return true
    if (key === "role_id") return (item.roles ?? []).some((role) => String(role.id) === String(value)) || String(item.role_id) === String(value)
    if (key === "subdivision_id") return (item.subdivisions ?? []).some((entry) => String(entry.id) === String(value))
    return String(item[key] ?? "").toLocaleLowerCase("ru").includes(String(value).toLocaleLowerCase("ru"))
  }))
  const sort = String(params.sort || "id")
  const field = sort.replace(/^-/, "")
  rows = [...rows].sort((a, b) => {
    const comparison = typeof a[field] === "number" && typeof b[field] === "number"
      ? a[field] - b[field]
      : String(a[field] ?? "").localeCompare(String(b[field] ?? ""), "ru", { numeric: true })
    return sort.startsWith("-") ? -comparison : comparison
  })
  const page = Math.max(1, Number(params.page) || 1)
  const size = Math.max(1, Number(params.page_size ?? params.per_page) || 20)
  const total = rows.length
  const offset = (page - 1) * size
  return { data: rows.slice(offset, offset + size), pagination: {
    current_page: page, per_page: size, total, last_page: Math.max(1, Math.ceil(total / size)),
    from: total > offset ? offset + 1 : null, to: total > offset ? Math.min(offset + size, total) : null,
  } }
}

export const collectDirectoryPages = async (fetchPage, params = {}) => {
  const items = []
  let page = 1
  let last = 1
  do {
    const result = await fetchPage({ ...params, page, page_size: 100 })
    items.push(...result.data)
    last = Number(result.pagination?.last_page) || 1
    page++
  } while (page <= last)
  return items
}
