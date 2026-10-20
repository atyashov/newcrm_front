import { apiGet, apiPost, apiPatch } from "@/api"

export const serverMessage = (error) => {
  const data = error?.response?.data ?? error
  const fields = Object.values(data?.errors ?? {}).flat().filter(value => typeof value === "string")
  return fields.join("\n") || data?.message || error?.message || "Не удалось выполнить запрос. Попробуйте снова."
}
const checked = (response) => {
  if (response?.status !== true) throw new Error(serverMessage(response))
  return response.data
}
export const fetchOutlayTab = async (kind, params) => {
  const response = kind === "receipts" ? await apiGet("admin/outlays/receipts", params)
    : kind === "operations" ? await apiGet("admin/cash-boxes/operations", params)
    : await apiPost("admin/outlays", params, { notify: false })
  const result = checked(response)
  if (!Array.isArray(result?.items?.data)) throw new Error("Сервер вернул некорректный список записей.")
  return { items: result.items.data, pagination: result.items, totals: result.totals ?? {} }
}
export const fetchAllOutlayEvents = async (kind, params, isCurrent = () => true) => {
  const items = []
  let page = 1
  let last = 1
  do {
    if (!isCurrent()) return []
    const result = await fetchOutlayTab(kind, { ...params, page, page_size: 100 })
    items.push(...result.items)
    last = Number(result.pagination.last_page) || 1
    page++
  } while (page <= last)
  return items
}
export const patchOutlay = async (id, section, payload) => {
  const result = checked(await apiPatch(`admin/outlays/${id}/${section}`, payload))
  return result.item
}
export const updateOutlayItemStage = async (outlayId, itemId, flag, value) => {
  const flags = ['assembled', 'uploaded', 'retrieved', 'checked', 'lost', 'defective']
  if (!flags.includes(flag) || typeof value !== 'boolean') throw new Error('Некорректное состояние позиции.')
  const result = checked(await apiPatch(`admin/outlays/${encodeURIComponent(outlayId)}/items/${encodeURIComponent(itemId)}/stages`, { [flag]: value }, { notify: false }))
  if (!result?.item?.stages || Number(result.item.id) !== Number(itemId)) throw new Error('Сервер вернул некорректные статусы позиции. Обновите страницу.')
  return result.item
}
export const updateOutlayText = async (outlayId, itemId, field, value) => {
  const fields = itemId != null ? ['assembly_comment', 'retrieve_comment']
    : ['additional_upload_comment', 'retriever_comment', 'damage_loss_comment']
  if (!fields.includes(field) || (value !== null && typeof value !== 'string')) throw new Error('Некорректное поле комментария.')
  const section = itemId != null ? `items/${encodeURIComponent(itemId)}/comments` : 'work-notes'
  const result = checked(await apiPatch(`admin/outlays/${encodeURIComponent(outlayId)}/${section}`, { [field]: value }, { notify: false }))
  const record = result?.item
  if (!record || Number(record.id) !== Number(itemId ?? outlayId) || !(itemId != null ? record.comments : record.work_notes)) {
    throw new Error('Сервер вернул некорректный комментарий. Обновите страницу.')
  }
  return record
}
