export const paginationRange = (meta = {}) => {
  if (meta.total == null) return null
  const total = Number(meta.total)
  if (!Number.isFinite(total) || total < 0) return null
  if (total === 0) return { from: 0, to: 0, total: 0 }
  const page = Number(meta.current_page) || 1
  const size = Number(meta.per_page)
  if (size <= 0 || !Number.isFinite(size)) return null
  const from = Number(meta.from ?? ((page - 1) * size + 1))
  const to = Number(meta.to ?? Math.min(page * size, total))
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null
  return from > total ? { from: 0, to: 0, total } : { from, to: Math.min(to, total), total }
}
