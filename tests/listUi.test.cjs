const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const read = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
const moduleFrom = file => import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`)

test('record range handles first/last/empty pages and explicit backend bounds', async () => {
  const { paginationRange } = await moduleFrom('utils/paginationRange.js')
  assert.deepEqual(paginationRange({ total: 148, per_page: 500, current_page: 1 }), { from: 1, to: 148, total: 148 })
  assert.deepEqual(paginationRange({ total: '148', per_page: '20', current_page: '8' }), { from: 141, to: 148, total: 148 })
  assert.deepEqual(paginationRange({ total: 148, per_page: 20, current_page: 1, from: 2, to: 19 }), { from: 2, to: 19, total: 148 })
  assert.deepEqual(paginationRange({ total: 0, per_page: 20, current_page: 1 }), { from: 0, to: 0, total: 0 })
  assert.equal(paginationRange({}), null)
  assert.equal(paginationRange({ total: -1 }), null)
  assert.deepEqual(paginationRange({ total: 1, per_page: 20, current_page: 2 }), { from: 0, to: 0, total: 1 })
})

test('product category and store labels use relations first, IDs as fallback, never request each product', async () => {
  const { productCategoryTitle, productStoreTitle } = await moduleFrom('views/components/productListLabels.js')
  assert.equal(productCategoryTitle({ categories: [{ id: 3, title: 'Tables' }] }), 'Tables')
  assert.equal(productCategoryTitle({ category_id: '3' }, [{ id: 3, title: 'Tables' }]), 'Tables')
  assert.equal(productCategoryTitle({}), '—')
  assert.equal(productStoreTitle({ store: { title: 'Main' }, store_id: 1 }), 'Main')
  assert.equal(productStoreTitle({ store_id: '1' }, [{ id: 1, title: 'Main' }]), 'Main')
  assert.equal(productStoreTitle({ store_id: 9 }), 'Склад №9')
  assert.equal(productStoreTitle({ store_id: null }), 'Без склада')
})

test('logout clears the token, in-memory authorization and user without deleting unrelated settings', () => {
  const values = new Map([['user-token', 'secret'], ['subdivision', '5']])
  const headers = { Authorization: 'Bearer secret', Accept: 'application/json' }
  const source = read('store/modules/user.js').replace(/^\uFEFF?import .*$/gm, '').replace('export default', 'return')
  const module = new Function('axios', 'API', 'TOKEN_USER_NAME', 'headers', 'localStorage', source)(
    {}, 'https://example.test', 'user-token', headers, { removeItem: key => values.delete(key) },
  )
  module.state.user = { id: 1, name: 'Admin' }
  module.actions.logoutUser({ commit: (name, data) => module.mutations[name](module.state, data) })
  assert.equal(values.has('user-token'), false)
  assert.equal(values.get('subdivision'), '5')
  assert.equal(headers.Authorization, undefined)
  assert.equal(headers.Accept, 'application/json')
  assert.deepEqual(module.state.user, {})
})
