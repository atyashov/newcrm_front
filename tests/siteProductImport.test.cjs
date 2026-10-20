const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.join(__dirname, '../src/views/FetchProductsFromSite.vue'), 'utf8')
  .split('<script setup>')[1].split('</script>')[0]
  .replace(/^import[\s\S]*?from "[^"]+"\r?\n/gm, '')
  .replace(/^import "[^"]+"\r?\n/gm, '')

const setup = (fetchProductsFromSite, createProduct = async () => ({ status: true })) => {
  const ref = (value) => ({ value })
  const computed = (getter) => ({ get value() { return getter() } })
  return new Function('ref', 'computed', 'watch', 'useStore', 'defineProps', 'defineEmits',
    'fetchProductsFromSite', 'createProduct', 'fetchAllStores', 'fetchCategories',
    `${source}; return { productsList, onlyNew, hasMore, page, loadProductsFromSite, saveProduct, resetState, requestError }`)(
    ref, computed, () => {}, () => ({ getters: {} }), () => ({ subdivisionId: 5 }), () => () => {},
    fetchProductsFromSite, createProduct, async () => [], async () => ({ data: [] }),
  )
}
const items = Array.from({ length: 250 }, (_, index) => ({ product_id: index + 1, name: `Product ${index + 1}`, price: '12.50', quantity: '1' }))

test('next page appends 100 items without replacing edited forms; end disables loading more', async () => {
  const calls = []
  const state = setup(async (params) => {
    calls.push(params)
    return items.slice((params.page - 1) * params.per_page, params.page * params.per_page)
  })
  await state.loadProductsFromSite()
  const first = state.productsList.value[0]
  first.title = 'Edited title'
  await state.loadProductsFromSite(true)
  assert.equal(state.productsList.value.length, 200)
  assert.equal(state.productsList.value[0], first)
  assert.equal(first.title, 'Edited title')
  assert.deepEqual(calls.map(call => call.page), [1, 2])
  await state.loadProductsFromSite(true)
  assert.equal(state.productsList.value.length, 250)
  assert.equal(state.hasMore.value, false)
})

test('successful creation removes the row and only_new offset adjustment prevents skipped IDs', async () => {
  const excluded = new Set()
  const state = setup(async (params) => {
    const available = items.filter(item => !params.only_new || !excluded.has(item.product_id))
    return available.slice((params.page - 1) * params.per_page, params.page * params.per_page)
  }, async (payload) => {
    excluded.add(payload.site_id)
    assert.equal(payload.description, '<p>Description</p>')
    assert.equal(payload.price, 12.5)
    return { status: true }
  })
  state.onlyNew.value = true
  await state.loadProductsFromSite()
  const first = state.productsList.value[0]
  first.category = { value: 1 }
  first.description = '<p>Description</p>'
  await state.saveProduct(first)
  assert.equal(state.productsList.value.length, 99)
  await state.loadProductsFromSite(true)
  assert.deepEqual(state.productsList.value.map(item => item.siteId), Array.from({ length: 199 }, (_, index) => index + 2))
})

test('failed creation keeps the form and its values', async () => {
  const state = setup(async () => items.slice(0, 100), async () => ({ status: false }))
  await state.loadProductsFromSite()
  const first = state.productsList.value[0]
  first.category = { value: 1 }
  await state.saveProduct(first)
  assert.equal(state.productsList.value[0], first)
  assert.ok(first.saveError)
})

test('subdivision reset ignores an outstanding response', async () => {
  let resolve
  const state = setup(() => new Promise(done => { resolve = done }))
  const pending = state.loadProductsFromSite()
  state.resetState()
  resolve(items)
  await pending
  assert.deepEqual(state.productsList.value, [])
  assert.equal(state.page.value, 0)
})
