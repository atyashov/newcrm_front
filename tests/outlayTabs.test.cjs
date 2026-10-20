const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const read = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
const helpers = () => import(`data:text/javascript;base64,${Buffer.from(read('views/components/outlayTabs.js')).toString('base64')}`)
const service = mocks => {
  const source = read('services/outlayTabsService.js').replace(/^import .*$/gm, '').replace(/export const /g, 'const ')
  return new Function('apiGet', 'apiPost', 'apiPatch', `${source}; return {fetchOutlayTab, fetchAllOutlayEvents, patchOutlay, serverMessage}`)(mocks.get, mocks.post, mocks.patch)
}

test('dispatch uses independent order/return dates, self flags and bounded server pages', async () => {
  const { tabParams, localDay } = await helpers()
  const input = { subdivisionId: 5, from: '2026-10-17', to: '2026-10-17', selfService: true, pageSize: 500, filters: { status_ids: [1,2], store_ids: [], title: '', self_return: false } }
  const orders = tabParams({ ...input, kind: 'orders' })
  assert.equal(orders.self_pickup, true)
  assert.equal(orders.self_return, false)
  assert.equal(orders.date_start_from, input.from)
  assert.equal(orders.page_size, 100)
  assert.equal('store_ids' in orders, false)
  const returns = tabParams({ ...input, kind: 'returns' })
  assert.equal(returns.self_return, true)
  assert.equal(returns.return_date_from, input.from)
  assert.equal('date_start_from' in returns, false)
  const payments = tabParams({ kind: 'receipts', from: '2026-10-01' })
  assert.equal(payments.date_from, '2026-10-01')
  assert.equal('subdivision_id' in payments, false)
  assert.equal(localDay(new Date(2026, 0, 2)), '2026-01-02')
})

test('text merges separate order and return events chronologically and uses return comments', async () => {
  const { scheduleText } = await helpers()
  const outlay = { id: 1, title: '<Event>', address: 'Address', execution_date: '2026-10-17 18:00:00', return_date: '2026-10-18 12:00:00', date_comment: 'Order note', return_date_comment: 'Return note' }
  const text = scheduleText([outlay], [{ ...outlay, id: 2, return_date: '2026-10-17 10:00:00' }, outlay])
  assert.ok(text.indexOf('(Возврат) 10:00 Return note') < text.indexOf('18:00 Order note'))
  assert.ok(text.includes('18.10.2026'))
  assert.ok(text.includes('(Возврат) 12:00 Return note'))
  assert.equal(scheduleText([], []), '')
})

test('tab services use real routes, server totals and partial mutation payloads', async () => {
  const calls = []
  const response = { status: true, data: { items: { data: [{ key: 'outlay:1:payment' }], last_page: 2, per_page: 20 }, totals: { amount: '1000.00' }, item: { id: 1 } } }
  const api = service({ get: async (...args) => { calls.push(args); return response }, post: async (...args) => { calls.push(args); return response }, patch: async (...args) => { calls.push(args); return response } })
  assert.equal((await api.fetchOutlayTab('receipts', { page: 1 })).totals.amount, '1000.00')
  await api.fetchOutlayTab('operations', {})
  await api.fetchOutlayTab('returns', {})
  await api.patchOutlay(1, 'assignments', { acceptor_ids: [] })
  assert.deepEqual(calls.map(call => call[0]), ['admin/outlays/receipts', 'admin/cash-boxes/operations', 'admin/outlays', 'admin/outlays/1/assignments'])
  assert.deepEqual(calls[3][1], { acceptor_ids: [] })
  assert.deepEqual(calls[2][2], { notify: false })
})

test('text loads every page and stops scheduling more pages after context invalidation', async () => {
  const calls = []
  const api = service({ post: async (url, params) => { calls.push(params); return {status:true,data:{items:{data:[{id:params.page}],last_page:3}}} } })
  assert.deepEqual(await api.fetchAllOutlayEvents('orders', { subdivision_id: 5 }), [{id:1},{id:2},{id:3}])
  assert.ok(calls.every(params => params.page_size === 100 && params.subdivision_id === 5))
  calls.length = 0
  await api.fetchAllOutlayEvents('returns', {}, () => calls.length === 0)
  assert.equal(calls.length, 1)
})

test('tab requests reject logical errors and malformed collections rather than showing empty success', async () => {
  const api = service({ get: async () => ({status:false, errors:{cash_box_id:['Access denied']}}) })
  await assert.rejects(api.fetchOutlayTab('receipts', {}), /Access denied/)
  const invalid = service({ get: async () => ({status:true,data:{items:[]}}) })
  await assert.rejects(invalid.fetchOutlayTab('operations', {}), /некорректный/)
})
