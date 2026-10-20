const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const read = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
const helpers = import(`data:text/javascript;base64,${Buffer.from(read('views/components/cashSummary.js')).toString('base64')}`)

test('cash chart labels positive, negative and zero amounts and recreates after expansion', async () => {
  const source = read('components/CashBoxesSummary.vue').split('<script setup>')[1].split('</script>')[0]
    .replace(/^import[\s\S]*?from "[^"]+"\r?\n/gm, '')
  let config
  let destroyed = 0
  class Chart {
    static register() {}
    constructor(canvas, options) { config = options }
    destroy() { destroyed++ }
  }
  const state = new Function('computed', 'ref', 'watch', 'onBeforeUnmount', 'useStore', 'defineProps', 'Chart',
    'BarController', 'BarElement', 'CategoryScale', 'LinearScale', 'Tooltip', 'cashSummaryMetrics', 'nextTick', 'getComputedStyle',
    `${source}; return { draw, report, canvas, root }`)(
    getter => ({ get value() { return getter() } }), value => ({ value }), () => {}, () => {},
    () => ({ state: {} }), () => ({}), Chart, null, null, null, null, null,
    [{ value: 'closing_balance', label: 'Balance' }], async () => {}, () => ({ getPropertyValue: () => '#fff' }),
  )
  state.report.value = { items: [{ title: 'A', closing_balance: 1234.56 }, { title: 'B', closing_balance: -10 }, { title: 'C', closing_balance: 0 }] }
  await state.draw()
  assert.equal(config, undefined)
  state.canvas.value = {}
  state.root.value = {}
  await state.draw()
  assert.deepEqual(config.data.datasets[0].data, [1234.56, -10, 0])
  assert.equal(config.data.datasets[0].barThickness, 22)
  assert.equal(config.options.layout.padding.top, 10)
  const xScale = { height: 0 }
  config.options.scales.x.afterFit(xScale)
  assert.equal(xScale.height, 30)
  const labels = []
  config.plugins[0].afterDatasetsDraw({
    chartArea: { left: 0, right: 500 },
    ctx: { save() {}, restore() {}, measureText: () => ({ width: 80 }), fillRect() {}, fillText: text => labels.push(text) },
    getDatasetMeta: () => ({ data: [{ x: 400, base: 200, y: 20 }, { x: 190, base: 200, y: 60 }, { x: 200, base: 200, y: 100 }] }),
  })
  const money = value => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(value)
  assert.deepEqual(labels, [money(1234.56), money(-10), money(0)])
  state.canvas.value = null
  await state.draw()
  assert.equal(destroyed, 1)
})

test('month defaults use local calendar boundaries including leap years and December', async () => {
  const { currentMonthRange } = await helpers
  assert.deepEqual(currentMonthRange(new Date(2026, 9, 11)), { date_start_from: '2026-10-01', date_start_to: '2026-10-31' })
  assert.equal(currentMonthRange(new Date(2024, 1, 12)).date_start_to, '2024-02-29')
  assert.equal(currentMonthRange(new Date(2026, 1, 12)).date_start_to, '2026-02-28')
  assert.equal(currentMonthRange(new Date(2026, 11, 31)).date_start_to, '2026-12-31')
})

test('summary service passes period/subdivision and preserves signed decimal strings', async () => {
  const data = { items: [{ id: 1, title: 'Cash', closing_balance: '-10.01' }], totals: { closing_balance: '-10.01' } }
  const params = { subdivision_id: 5, date_start_from: '2026-10-01', date_start_to: '2026-10-31' }
  const source = read('services/cashBoxesService.js').replace(/^import .*\n/gm, '').replace(/export const /g, 'const ')
  const service = new Function('apiGet', `${source}; return fetchCashBoxesSummary`)(async (url, sent) => {
    assert.equal(url, 'admin/cash-boxes/summary')
    assert.deepEqual(sent, params)
    return { status: true, data }
  })
  assert.deepEqual(await service(params), data)
  const failed = new Function('apiGet', `${source}; return fetchCashBoxesSummary`)(async () => ({ status: false }))
  await assert.rejects(failed(params))
})

test('report refreshes only its own context and ignores old subdivision responses', async () => {
  const source = read('components/CashBoxesSummary.vue').split('<script setup>')[1].split('</script>')[0]
    .replace(/^import[\s\S]*?from "[^"]+"\r?\n/gm, '')
  const props = { subdivisionId: 5, dateFrom: '2026-10-01', dateTo: '2026-10-31', refreshKey: 0 }
  const watches = []
  const calls = []
  let finishOld
  const state = new Function('computed', 'ref', 'watch', 'onBeforeUnmount', 'useStore', 'defineProps', 'Chart',
    'BarController', 'BarElement', 'CategoryScale', 'LinearScale', 'Tooltip', 'cashSummaryMetrics', 'fetchCashBoxesSummary',
    `${source}; return { load, report, error, loading }`)(
    getter => ({ get value() { return getter() } }), value => ({ value }),
    (...args) => watches.push(args), () => {}, () => ({ state: { isDarkMode: false } }), () => props,
    { register() {} }, null, null, null, null, null, [],
    async params => {
      calls.push(params)
      if (params.subdivision_id === 5) return new Promise(resolve => { finishOld = resolve })
      return { items: [], totals: {}, subdivision_id: params.subdivision_id }
    },
  )
  assert.deepEqual(watches[0][0](), [5, '2026-10-01', '2026-10-31', 0])
  const oldRequest = state.load()
  props.subdivisionId = 6
  await state.load()
  finishOld({ items: [], totals: {}, subdivision_id: 5 })
  await oldRequest
  assert.equal(state.report.value.subdivision_id, 6)
  props.dateFrom = ''
  await state.load()
  assert.equal(calls.length, 2)
  assert.equal(state.report.value, null)
})
