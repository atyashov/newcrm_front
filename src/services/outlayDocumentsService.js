import axios from 'axios'
import { API, TOKEN_USER_NAME, apiGet, apiPost } from '@/api'
import { serverMessage } from './outlayTabsService'
import { documentFormats, downloadFilename } from '@/utils/outlayDocuments'

const data = response => {
  if (response?.status !== true) throw new Error(serverMessage(response))
  return response.data
}
export const fetchOutlayInfo = async id => data(await apiGet(`admin/outlays/${encodeURIComponent(id)}/info`))
export const fetchOutlayDocuments = async id => data(await apiGet(`admin/outlays/${encodeURIComponent(id)}/documents`)).items ?? []
export const rotateOutlayLink = async id => data(await apiPost(`admin/outlays/${encodeURIComponent(id)}/public-link/rotate`, {}, { notify: false }))

// A separate Axios instance prevents admin defaults/interceptors from reaching the public API.
const publicClient = axios.create({ baseURL: `${API.replace(/\/$/, '')}/`, withCredentials: false, headers: { Authorization: undefined } })
export const fetchPublicOutlay = async uuid => data((await publicClient.get(`pub/outlays/${encodeURIComponent(uuid)}`, { headers: { Authorization: undefined } })).data).item
export const fetchOutlayViewer = async id => {
  const token = localStorage.getItem(TOKEN_USER_NAME)
  if (!token) return null
  try {
    const config = { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
    const user = await publicClient.get('user', config)
    if (!user.data?.id) return null
    return data((await publicClient.get(`admin/outlays/${encodeURIComponent(id)}/info`, config)).data)
  } catch { return null }
}

export const downloadOutlayFile = async (path, params, fallback) => {
  let response
  try {
    response = await axios.get(`${API.replace(/\/$/, '')}/${path}`, {
      params, responseType: 'blob', headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_USER_NAME) || ''}` },
    })
    if (/json|text\/html/i.test(response.headers?.['content-type'] || '')) {
      let result = {}
      try { result = JSON.parse(await response.data.text()) } catch { /* Use a safe fallback for non-JSON errors. */ }
      throw new Error(serverMessage(result))
    }
  } catch (error) {
    let result = error.response?.data
    if (result?.text) {
      try { result = JSON.parse(await result.text()) } catch { result = null }
    }
    throw new Error(result ? serverMessage(result) : error.response ? `Не удалось скачать документ (HTTP ${error.response.status}). Попробуйте позже.` : serverMessage(error))
  }
  const filename = downloadFilename(response.headers?.['content-disposition'], fallback)
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.rel = 'noreferrer'
  document.body.appendChild(anchor)
  try { anchor.click() } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
export const downloadOutlayDocument = (id, type) => {
  if (!Object.prototype.hasOwnProperty.call(documentFormats, type)) throw new Error('Неизвестный тип документа.')
  return downloadOutlayFile(`admin/outlays/${encodeURIComponent(id)}/documents/${type}`, {}, `outlay-${id}-${type}.${documentFormats[type]}`)
}
export const downloadPeriodPdf = params => downloadOutlayFile('admin/outlays/documents/period-pdf', params, `outlays-${params.date_from}-${params.date_to}.pdf`)
