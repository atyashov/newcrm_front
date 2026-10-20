const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vue = require('vue')

const source = fs.readFileSync(path.join(__dirname, '../src/views/components/useProductAvailability.js'), 'utf8')
  .replace(/^import .*\n/gm, '').replace(/export const /g, 'const ')
const load = (fetchProductAvailability) => new Function(
  'vue', 'fetchProductAvailability',
  `const { computed, onScopeDispose, ref, watch } = vue; ${source}; return { useProductAvailability, availabilityDate, uniqueProductIds }`,
)(vue, fetchProductAvailability)
const wait = () => new Promise((resolve) => setTimeout(resolve, 350))
const groups = (ids) => [{ items: ids.map((id) => ({ product: { value: id }, quantity: '2' })) }]
const setup = (fetcher, ids = [12, 12, 34]) => {
  const scope = vue.effectScope()
  const input = {
    groups: vue.ref(groups(ids)), subdivisionId: vue.ref(5), outlayId: vue.ref(123),
    startsAt: vue.ref('2026-10-10T10:00'), endsAt: vue.ref('2026-10-11T18:00'), ready: vue.ref(true),
  }
  const state = scope.run(() => load(fetcher).useProductAvailability(input))
  return { scope, input, state }
}
const response = (ids) => ({ status: true, data: { items: ids.map((id) => ({ product_id: id, available_quantity: '75.000' })) } })

test('one batch sends unique IDs, full local date/time and edited outlay ID; quantity changes stay local', async () => {
  const calls = []
  const h = setup(async (payload) => { calls.push(payload); return response(payload.product_ids) })
  try {
    await wait()
    assert.deepEqual(calls, [{ subdivision_id: 5, product_ids: [12, 34], starts_at: '2026-10-10 10:00:00', ends_at: '2026-10-11 18:00:00', outlay_id: 123 }])
    assert.equal(h.state.items.value[12].available_quantity, '75.000')
    h.input.groups.value[0].items[0].quantity = '4'
    await wait()
    assert.equal(calls.length, 1)
  } finally { h.scope.stop() }
})

test('date changes invalidate old responses immediately and refresh once', async () => {
  const pending = []
  const h = setup((payload) => new Promise((resolve) => pending.push({ payload, resolve })))
  try {
    await wait()
    h.input.endsAt.value = '2026-10-12T18:00'
    pending[0].resolve(response([12, 34]))
    await Promise.resolve()
    assert.deepEqual(h.state.items.value, {})
    await wait()
    pending[1].resolve(response([12, 34]))
    await Promise.resolve()
    assert.equal(h.state.items.value[12].available_quantity, '75.000')
  } finally { h.scope.stop() }
})

test('creation omits outlay ID, permits absent return date, splits over 1000 products', async () => {
  const calls = []
  const h = setup(async (payload) => { calls.push(payload); return response(payload.product_ids) }, Array.from({ length: 1001 }, (_, i) => i + 1))
  try {
    h.input.outlayId.value = null
    h.input.endsAt.value = ''
    await wait()
    assert.equal(calls.length, 2)
    assert.equal(calls[0].product_ids.length, 1000)
    assert.equal(calls[1].product_ids.length, 1)
    assert.equal('outlay_id' in calls[0], false)
    assert.equal(calls[0].ends_at, null)
  } finally { h.scope.stop() }
})

test('validation errors are shown without blocking saved groups and prices', async () => {
  const h = setup(async () => { throw { response: { data: { errors: { ends_at: ['Return date required'] } } } } })
  try {
    await wait()
    assert.equal(h.state.error.value, 'Return date required')
    assert.equal(h.state.loading.value, false)
    assert.equal(h.input.groups.value[0].items.length, 3)
    assert.deepEqual(h.state.items.value, {})
  } finally { h.scope.stop() }
})
