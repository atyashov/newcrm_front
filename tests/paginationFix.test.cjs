const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const read = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
const computed = definition => ({
  get value() { return typeof definition === 'function' ? definition() : definition.get() },
  set value(value) { definition.set(value) },
})

test('products and categories send the backend pageSize, including default and subsequent pages', async () => {
  const calls = []
  const source = read('services/productsService.js').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
  const service = new Function('apiGet', `${source}; return { fetchProducts, fetchCategories }`)(async (url, params) => {
    calls.push({ url, params })
    return { status: true, data: { items: { data: [], per_page: params.pageSize, current_page: params.page, total: 101, from: 51, to: 100 } } }
  })
  await service.fetchProducts()
  assert.deepEqual(calls[0], { url: 'admin/products', params: { pageSize: 20 } })
  const products = await service.fetchProducts({ page: 2, page_size: 50, subdivision_id: 5 })
  assert.deepEqual(calls[1].params, { page: 2, pageSize: 50, subdivision_id: 5 })
  assert.equal(products.pagination.per_page, 50)
  const categories = await service.fetchCategories({ page: 2, per_page: 50, title: 'Test' })
  assert.deepEqual(calls[2].params, { page: 2, pageSize: 50, title: 'Test' })
  assert.equal(categories.pagination.from, 51)
  assert.equal(categories.pagination.to, 100)
})

test('pagination displays actual backend size instead of silently displaying 20', () => {
  const props = { pagination: { per_page: 15 }, pageSizeOptions: [20, 50, 100, 500] }
  const events = []
  const source = read('components/MaterialPagination.vue').split('<script setup>')[1].split('</script>')[0]
    .replace(/^import .*$/gm, '')
  const state = new Function('computed', 'useCssModule', 'defineProps', 'defineEmits',
    `${source}; return { selectedPageSize, pageSizeOptions }`)(computed, () => ({}), () => props, () => (...args) => events.push(args))
  assert.equal(state.selectedPageSize.value, '15')
  assert.deepEqual(state.pageSizeOptions.value, [15, 20, 50, 100, 500])
  state.selectedPageSize.value = '50'
  assert.deepEqual(events, [['pageSizeChange', 50]])
  assert.deepEqual(props.pageSizeOptions, [20, 50, 100, 500])
})

test('shared pagination synchronizes future requests with returned per_page', () => {
  const source = read('views/components/usePagination.js').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
  const usePagination = new Function('computed', 'ref', `${source}; return usePagination`)(computed, value => ({ value }))
  const state = usePagination()
  assert.equal(state.pageSize.value, 20)
  state.updatePaginationMeta({ current_page: 2, last_page: 10, per_page: '50', total: 500 })
  assert.equal(state.pageSize.value, 50)
  assert.equal(state.paginationMeta.value.per_page, 50)
  assert.equal(state.currentPage.value, 2)
  state.updatePaginationMeta({ current_page: 3, total: 500 })
  assert.equal(state.pageSize.value, 50)
})

test('outlay validation reports missing creator and other required select fields', () => {
  const source = read('views/CreateOutlay.vue').split('const validate = () => {')[1].split('const handleSubmit')[0]
  const fields = { value: new Set() }
  const validate = new Function('formState', 'invalidFields', 'compositionMessage', 'compositionError', 'groups',
    'subdivisionMismatch', 'validDecimal', 'totals', 'selectedStatus', 'hasRentalProducts', 'subdivisionId',
    `return () => {${source}`)(
    { title: '', percent_discount: '', discount_amount: '' }, fields, { value: '' }, () => '', { value: [] },
    { value: false }, () => true, { value: { total: 0n } }, { value: null }, { value: false }, { value: 5 },
  )
  assert.equal(validate(), false)
  assert.deepEqual([...fields.value], ['execution_date', 'title', 'partner_entity', 'client_id', 'creator_id', 'status_id'])
})
