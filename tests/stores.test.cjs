const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const read = (file) => fs.readFileSync(path.join(__dirname, '../src/', file), 'utf8')
const storeHelpers = import(`data:text/javascript;base64,${Buffer.from(read('views/components/outlayStores.js')).toString('base64')}`)

test('outlay stores are unique by ID, not title, and unassigned products are excluded', async () => {
  const { outlayStores } = await storeHelpers
  assert.deepEqual(outlayStores({ stores: [{ id: 1, title: 'Main' }, { id: 1, title: 'Main' }, { id: 2, title: 'Main' }, null] }).map(s => s.id), [1, 2])
  assert.deepEqual(outlayStores({ groups: [{ items: [{ product: { store: { id: 3, title: 'West' } } }, { product: { store: null } }] }] }), [{ id: 3, title: 'West' }])
  assert.deepEqual(outlayStores({}), [])
  assert.deepEqual(outlayStores({ stores: [], groups: [{ items: [{ product: { store: { id: 3, title: 'West' } } }] }] }), [])
})

test('stores service preserves pagination and fetches all selector pages with allowed page sizes', async () => {
  const calls = []
  const apiGet = async (url, params) => {
    calls.push({ url, params })
    return { status: true, data: { items: { data: [{ id: params.page, title: `Store ${params.page}` }], current_page: params.page, per_page: 100, last_page: 2, total: 101 } } }
  }
  const source = read('services/storesService.js').replace(/^import .*\n/gm, '').replace(/export const /g, 'const ')
  const { fetchStores, fetchAllStores } = new Function('apiGet', 'apiPost', 'apiPut', 'apiDelete', `${source}; return { fetchStores, fetchAllStores }`)(apiGet)
  const page = await fetchStores({ page: 1 })
  assert.equal(page.pagination.per_page, 100)
  calls.length = 0
  assert.deepEqual((await fetchAllStores()).map(s => s.id), [1, 2])
  assert.equal(calls.length, 2)
  assert.ok(calls.every(c => c.url === 'admin/stores' && c.params.page_size === 100))
})
