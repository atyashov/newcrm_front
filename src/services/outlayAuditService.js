import { apiGet } from '@/api'
import { serverMessage } from './outlayTabsService'
export const fetchOutlayAudit = async (id, params = {}) => {
  const response = await apiGet(`admin/outlays/${encodeURIComponent(id)}/audit`, params)
  if (response?.status !== true) throw new Error(serverMessage(response))
  const data = response.data
  if (!Array.isArray(data?.items?.data) || !data.summary) throw new Error('Сервер вернул некорректный журнал сметы.')
  return data
}
