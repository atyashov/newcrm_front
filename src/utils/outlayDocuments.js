export const documentFormats = {
  'return-act': 'docx', 'lease-contract': 'docx', 'specification-1': 'xlsx',
  'specification-2': 'xlsx', contract: 'docx', estimate: 'xlsx', 'service-act': 'xlsx', 'estimate-pdf': 'pdf',
}
export const publicOutlayPath = uuid => `/outlay/${encodeURIComponent(uuid)}`
export const privateOutlayPath = (id, action, base = process.env.BASE_URL || '/') =>
  `${base.replace(/\/$/, '')}${action === 'copy' ? `/outlays/create?copy_from=${encodeURIComponent(id)}` : `/outlays/${encodeURIComponent(id)}/${action}`}`
export const isPublicOutlayPath = (pathname, base = '/') => {
  const prefix = base.replace(/\/$/, '')
  const path = prefix && pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname
  return /^\/outlay\/(?:show\/)?[^/]+\/?$/.test(path)
}
export const publicOutlayUrl = (uuid, origin = window.location.origin, base = process.env.BASE_URL || '/') =>
  `${origin}${base.replace(/\/$/, '')}${publicOutlayPath(uuid)}`

export const safeWebUrl = value => {
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch { return '' }
}
export const imageUrl = value => safeWebUrl(value)
export const subdivisionLogoUrl = subdivision => imageUrl(
  subdivision?.images?.[0]?.url ?? subdivision?.logo?.url ?? subdivision?.logo_url ?? subdivision?.logo,
)
// Descriptions remain plain text; never render server HTML via v-html.
export const descriptionText = value => {
  const html = String(value ?? '').replace(/<br\s*\/?\s*>|<\/p>|<\/div>/gi, '\n')
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return html.replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, code) => {
    if (code[0] !== '#') return entities[code.toLowerCase()] ?? match
    const number = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : match
  }).trim()
}
export const downloadFilename = (header, fallback) => {
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header || '')
  const regular = /filename="([^"]+)"|filename=([^;]+)/i.exec(header || '')
  let name = encoded?.[1] || regular?.[1] || regular?.[2] || fallback
  try { if (encoded) name = decodeURIComponent(name) } catch { name = fallback }
  return Array.from(name, char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? '_' : char)
    .join('').replace(/[<>:"/\\|?*]/g, '_').trim() || fallback
}
