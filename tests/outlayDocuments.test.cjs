const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const read = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
const helpers = () => import(`data:text/javascript;base64,${Buffer.from(read('utils/outlayDocuments.js')).toString('base64')}`)

test('public paths are isolated from private routes and frontend links support base paths', async () => {
  const { isPublicOutlayPath, publicOutlayUrl, downloadFilename } = await helpers()
  assert.equal(isPublicOutlayPath('/outlay/uuid'), true)
  assert.equal(isPublicOutlayPath('/outlay/show/uuid'), true)
  assert.equal(isPublicOutlayPath('/crm/outlay/uuid', '/crm/'), true)
  assert.equal(isPublicOutlayPath('/outlays/123/info'), false)
  assert.equal(publicOutlayUrl('abc', 'https://crm.test', '/crm/'), 'https://crm.test/crm/outlay/abc')
  assert.equal(downloadFilename("attachment; filename*=UTF-8''%D0%A1%D0%BC%D0%B5%D1%82%D0%B0.pdf", 'fallback.pdf'), 'Смета.pdf')
  assert.equal(downloadFilename('attachment; filename="../bad.pdf"', 'fallback.pdf'), '.._bad.pdf')
})

test('public descriptions remain inert text and asset/link protocols are constrained', async () => {
  const { descriptionText, imageUrl, safeWebUrl } = await helpers()
  assert.equal(descriptionText('<p>A &amp; B<br>Next</p>'), 'A & B\nNext')
  assert.equal(descriptionText('<img src=x onerror=alert(1)>Safe'), 'Safe')
  assert.equal(descriptionText('&lt;script&gt;alert(1)&lt;/script&gt;'), '<script>alert(1)</script>')
  assert.equal(safeWebUrl('javascript:alert(1)'), '')
  assert.equal(imageUrl('data:text/html,test', 'https://files.test'), '')
  assert.equal(imageUrl('products/pic.jpg'), '')
  assert.equal(imageUrl('https://files.test/products/pic.jpg'), 'https://files.test/products/pic.jpg')
})

test('document service uses auth for downloads but not the independent public client', async () => {
  const { documentFormats, downloadFilename } = await helpers()
  let storedToken = 'current-token', authenticated = false, canRead = true
  const calls = [], publicCalls = [], localStorage = { getItem: () => storedToken }
  const response = { data: new Blob(['file']), headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="estimate.pdf"' } }
  let creation
  const axios = { create: config => { creation = config; return { get: async (...args) => {
    publicCalls.push(args)
    if (args[0] === 'user') return {data:{id:authenticated ? 7 : null}}
    if (args[0].startsWith('admin/') && !canRead) throw new Error('Forbidden')
    return {data:{status:true,data:{item:{id:1}}}}
  } } }, get: async (...args) => { calls.push(args); return response } }
  const anchors = []
  const document = { createElement: () => { const anchor = {click(){this.clicked=true},remove(){this.removed=true}}; anchors.push(anchor); return anchor }, body: {appendChild(){}} }
  const urls = [], URL = { createObjectURL: () => 'blob:doc', revokeObjectURL: value => urls.push(value) }
  const source = read('services/outlayDocumentsService.js').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
  const api = new Function('axios','API','TOKEN_USER_NAME','apiGet','apiPost','serverMessage','documentFormats','downloadFilename','localStorage','document','URL','setTimeout', `${source}; return {fetchPublicOutlay, fetchOutlayViewer, downloadOutlayDocument, downloadPeriodPdf}`)(axios,'https://api.test/api','token',null,null, data => Object.values(data?.errors || {}).flat().join(' ') || data?.message || 'error',documentFormats,downloadFilename,localStorage,document,URL,fn=>fn())
  assert.equal((await api.fetchPublicOutlay('uuid')).id, 1)
  assert.equal(creation.withCredentials, false)
  assert.equal(creation.headers.Authorization, undefined)
  assert.equal(publicCalls[0][1].headers.Authorization, undefined)
  storedToken = ''
  const count = publicCalls.length
  assert.equal(await api.fetchOutlayViewer(1), null)
  assert.equal(publicCalls.length, count)
  storedToken = 'current-token'
  assert.equal(await api.fetchOutlayViewer(1), null)
  assert.equal(publicCalls.at(-1)[0], 'user')
  authenticated = true
  assert.equal((await api.fetchOutlayViewer(1)).item.id, 1)
  assert.equal(publicCalls.at(-1)[0], 'admin/outlays/1/info')
  assert.equal(publicCalls.at(-1)[1].headers.Authorization, 'Bearer current-token')
  canRead = false
  assert.equal(await api.fetchOutlayViewer(1), null)
  await api.downloadOutlayDocument(1, 'estimate-pdf')
  assert.equal(calls[0][0], 'https://api.test/api/admin/outlays/1/documents/estimate-pdf')
  assert.equal(calls[0][1].headers.Authorization, 'Bearer current-token')
  assert.equal(calls[0][1].responseType, 'blob')
  assert.equal(anchors[0].download, 'estimate.pdf')
  assert.equal(anchors[0].clicked && anchors[0].removed, true)
  assert.deepEqual(urls, ['blob:doc'])
  await api.downloadPeriodPdf({ date_from:'2026-10-01', date_to:'2026-10-31', subdivision_id:5 })
  assert.equal(calls[1][1].params.subdivision_id, 5)
  response.data = new Blob([JSON.stringify({ errors: {client:['Missing client details']} })])
  response.headers = { 'content-type': 'application/json' }
  await assert.rejects(api.downloadOutlayDocument(1, 'contract'), /Missing client details/)
  axios.get = async () => { const error = new Error('Request failed'); error.response = {status:422, data:new Blob([JSON.stringify({errors:{date_to:['Reduce period']}})])}; throw error }
  await assert.rejects(api.downloadPeriodPdf({}), /Reduce period/)
  assert.throws(() => api.downloadOutlayDocument(1, 'unknown'), /Неизвестный/)
})

test('public startup bypasses auth bootstrap and public screen never renders server HTML', () => {
  const startup = read('main.js')
  const start = startup.indexOf('if (isPublicOutlayPath')
  const branch = startup.slice(start, startup.indexOf('\n} else {', start))
  assert.ok(branch.includes('createApp(PublicApp)'))
  assert.equal(branch.includes('runLogin()'), false)
  assert.equal(branch.includes('mountApp()'), false)
  assert.equal(branch.includes('removeItem'), false)
  const screen = read('views/PublicOutlay.vue') + read('components/OutlaySnapshot.vue')
  assert.equal(screen.includes('v-html='), false)
  assert.equal(screen.includes('fetchOutlayInfo'), false)
  assert.equal(screen.includes('OutlayDocuments'), false)
  assert.ok(read('../public/index.html').includes('name="referrer" content="no-referrer"'))
})

test('public snapshot escapes descriptions and exposes only presentation fields', async () => {
  const vue = require('vue')
  const { renderToString } = require('@vue/server-renderer')
  const { parse, compileScript } = require('@vue/compiler-sfc')
  const babel = require('@babel/core')
  const documents = await helpers()
  const tabs = await import(`data:text/javascript;base64,${Buffer.from(read('views/components/outlayTabs.js')).toString('base64')}`)
  const { descriptor } = parse(read('components/OutlaySnapshot.vue'))
  const source = compileScript(descriptor, { id:'snapshot', inlineTemplate:true }).content
  const { code } = babel.transformSync(source, {configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']})
  const module = {exports:{}}
  new Function('require','module','exports',code)(name => name === 'vue' ? vue : name.includes('outlayDocuments') ? documents : tabs,module,module.exports)
  const item = {id:1,title:'<Title>',creator:{login:'PRIVATE_LOGIN'},payment_cash_box:{title:'PRIVATE_CASH'},total_cost:'10.00',subdivision:{site_link:'javascript:alert(1)',images:[{path:'wrong-logo.png',url:'https://files.test/logo.png'}]},groups:[{id:1,name:'Group',items:[{id:2,product_title_snapshot:'Product',price:'10',quantity:'1',total_cost:'10',description:'&lt;script&gt;alert(1)&lt;/script&gt;',images:[{path:'wrong-image.jpg',url:'https://files.test/photo.jpg'},{path:'javascript:alert(1)',url:'javascript:alert(1)'}]}]}]}
  const html = await renderToString(vue.createSSRApp({render:()=>vue.h(module.exports.default,{item})}))
  assert.ok(html.includes('&lt;Title&gt;'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.equal(html.includes('<script'), false)
  assert.equal(html.includes('href="javascript:'), false)
  assert.equal(html.includes('src="javascript:'), false)
  assert.equal(html.includes('PRIVATE_LOGIN'), false)
  assert.equal(html.includes('PRIVATE_CASH'), false)
  assert.ok(html.includes('src="https://files.test/photo.jpg"'))
  assert.ok(html.includes('src="https://files.test/logo.png"'))
  assert.equal(html.includes('wrong-image.jpg'), false)
})
