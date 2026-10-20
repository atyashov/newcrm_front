<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue"
import { useStore } from "vuex"
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js"
import MaterialSelect from "@/components/MaterialSelect.vue"
import { fetchCashBoxesSummary } from "@/services/cashBoxesService"
import { cashSummaryMetrics } from "@/views/components/cashSummary"

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)
const props = defineProps({
  subdivisionId: { type: [String, Number], default: null },
  dateFrom: { type: String, default: "" },
  dateTo: { type: String, default: "" },
  refreshKey: { type: Number, default: 0 },
})
const store = useStore()
const report = ref(null)
const loading = ref(false)
const error = ref("")
const metric = ref("closing_balance")
const canvas = ref(null)
const root = ref(null)
const expanded = ref(false)
let chart
let version = 0
const validPeriod = computed(() => props.dateFrom && props.dateTo && props.dateFrom <= props.dateTo)
const totalMetrics = [
  ...cashSummaryMetrics,
  { value: "outlays_total", label: "Сумма смет за период" },
  { value: "outlays_forecast", label: "Прогноз поступлений по заказам" },
  { value: "forecast_closing_balance", label: "Прогноз остатка" },
]
const money = (value) => new Intl.NumberFormat("ru-RU", {
  style: "currency", currency: "RUB", maximumFractionDigits: 2,
}).format(Number(value) || 0)

const load = async () => {
  const current = ++version
  report.value = null
  error.value = ""
  loading.value = false
  if (!props.subdivisionId || !validPeriod.value) return
  loading.value = true
  try {
    const data = await fetchCashBoxesSummary({
      subdivision_id: Number(props.subdivisionId),
      date_start_from: props.dateFrom,
      date_start_to: props.dateTo,
    })
    if (current === version) report.value = data
  } catch (reason) {
    if (current === version) {
      error.value = reason?.response?.status === 403
        ? "Нет доступа к финансовому отчёту."
        : reason?.response?.data?.message || reason.message || "Не удалось загрузить отчёт."
    }
  } finally {
    if (current === version) loading.value = false
  }
}
const draw = async () => {
  await nextTick()
  chart?.destroy()
  chart = null
  if (!canvas.value || !report.value?.items.length) return
  const styles = getComputedStyle(root.value)
  const color = (name) => styles.getPropertyValue(name).trim()
  const items = report.value.items
  const label = cashSummaryMetrics.find((item) => item.value === metric.value)?.label
  chart = new Chart(canvas.value, {
    type: "bar",
    data: {
      labels: items.map((item) => item.title),
      datasets: [{
        label,
        data: items.map((item) => Number(item[metric.value]) || 0),
        backgroundColor: items.map((item) => color(Number(item[metric.value]) < 0 ? "--cash-danger" : "--cash-primary")),
        borderRadius: 3,
        barThickness: 22,
        categoryPercentage: 1,
        barPercentage: 1,
      }],
    },
    plugins: [{
      id: "cashAmounts",
      afterDatasetsDraw(instance) {
        const { ctx, chartArea } = instance
        ctx.save()
        ctx.font = "12px sans-serif"
        ctx.textBaseline = "middle"
        instance.getDatasetMeta(0).data.forEach((bar, index) => {
          const text = money(items[index][metric.value])
          const width = ctx.measureText(text).width
          const inside = Math.abs(bar.x - bar.base) >= width + 16
          const negative = Number(items[index][metric.value]) < 0
          let x = inside
            ? (negative ? bar.x + 8 : bar.x - width - 8)
            : (negative ? bar.x - width - 8 : bar.x + 8)
          x = Math.max(chartArea.left + 4, Math.min(x, chartArea.right - width - 4))
          if (!inside) {
            ctx.fillStyle = color("--outlay-surface")
            ctx.fillRect(x - 3, bar.y - 9, width + 6, 18)
          }
          ctx.fillStyle = color(inside ? "--cash-label" : "--outlay-text")
          ctx.fillText(text, x, bar.y)
        })
        ctx.restore()
      },
    }],
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: { top: 10 } },
      plugins: { tooltip: { callbacks: { label: (context) => `${label}: ${money(context.parsed.x)}` } } },
      scales: {
        x: { beginAtZero: true, afterFit: (scale) => { scale.height = 30 }, ticks: { color: color("--outlay-text"), callback: (value) => new Intl.NumberFormat("ru-RU", { notation: "compact" }).format(value) }, grid: { color: color("--outlay-border") } },
        y: { ticks: { color: color("--outlay-text"), autoSkip: false }, grid: { display: false } },
      },
    },
  })
}
watch(() => [props.subdivisionId, props.dateFrom, props.dateTo, props.refreshKey], load, { immediate: true })
watch([report, metric, expanded, () => store.state.isDarkMode], draw, { flush: "post" })
onBeforeUnmount(() => {
  version += 1
  chart?.destroy()
})
</script>

<template>
  <details ref="root" class="cash-summary" aria-label="Финансовый отчёт" @toggle="expanded = $event.target.open">
    <summary class="cash-summary-heading">
      <h2>Финансы за период</h2>
      <span v-if="validPeriod">{{ dateFrom }} — {{ dateTo }}</span>
    </summary>
    <div v-if="expanded">
    <p class="cash-summary-note">По выбранному подразделению и датам. Остальные фильтры списка смет не применяются.</p>
    <p v-if="!subdivisionId">Выберите подразделение для просмотра отчёта.</p>
    <p v-else-if="!validPeriod">Укажите обе даты периода: дата начала не должна быть позже даты окончания.</p>
    <p v-else-if="loading" role="status">Загрузка финансового отчёта...</p>
    <div v-else-if="error" class="text-danger" role="alert">
      {{ error }} <button type="button" class="btn btn-link p-0 mb-0" @click="load">Повторить</button>
    </div>
    <template v-else-if="report">
      <div class="cash-summary-totals">
        <div v-for="entry in totalMetrics" :key="entry.value" class="cash-summary-total">
          <span>{{ entry.label }}</span>
          <strong :class="{ 'text-danger': Number(report.totals[entry.value]) < 0 }">{{ money(report.totals[entry.value]) }}</strong>
        </div>
      </div>
      <details class="cash-summary-details cash-summary-help">
        <summary>Как рассчитываются прогнозы</summary>
        <p>Прогноз поступлений = стоимость всех смет с датой заказа в периоде − оплаты этих смет, полученные до начала периода + поступления в периоде по заказам с датой вне периода.</p>
        <p>Это ожидаемые поступления за весь период при полной оплате его заказов, а не только оставшийся долг. Уже полученные в этом периоде оплаты не вычитаются повторно.</p>
        <p>Прогноз остатка = остаток на начало + прогноз поступлений − расходы + полученные займы − выданные займы. Расходы и займы берутся из записанных документов периода; будущие незаписанные операции не учитываются.</p>
        <p>Остаток на начало сейчас рассчитывается по операциям подразделения до начала периода. Вручную заданный начальный остаток кассы сервер в эту формулу не добавляет.</p>
      </details>
      <template v-if="report.items.length">
        <div class="cash-summary-controls">
          <MaterialSelect id="cash-summary-metric" v-model="metric" label="Показатель по кассам" :options="cashSummaryMetrics" />
        </div>
        <div class="cash-summary-chart-scroll">
          <div class="cash-summary-chart" :style="{ height: `${report.items.length * 24 + 40}px` }">
            <canvas ref="canvas" role="img" :aria-label="cashSummaryMetrics.find(entry => entry.value === metric)?.label + ' по кассам'"></canvas>
          </div>
        </div>
        <details class="cash-summary-details">
          <summary>Точные значения по кассам</summary>
          <div class="cash-summary-table-scroll">
            <table>
              <thead><tr><th scope="col">Касса</th><th v-for="entry in cashSummaryMetrics" :key="entry.value" scope="col">{{ entry.label }}</th></tr></thead>
              <tbody>
                <tr v-for="item in report.items" :key="item.id">
                  <th scope="row">{{ item.title }}</th>
                  <td v-for="entry in cashSummaryMetrics" :key="entry.value" :class="{ 'text-danger': Number(item[entry.value]) < 0 }">{{ money(item[entry.value]) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </template>
      <p v-else>Кассы не найдены.</p>
    </template>
    </div>
  </details>
</template>

<style scoped lang="scss">
.cash-summary { margin: 0 0 1rem; padding: 0.75rem; border: 1px solid var(--outlay-border); border-radius: 0.5rem; background: var(--outlay-surface); color: var(--outlay-text); }
.cash-summary-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; cursor: pointer; list-style: none; }
.cash-summary-heading::-webkit-details-marker { display: none; }
.cash-summary-heading::before { content: "+"; font-weight: 700; }
.cash-summary[open] > .cash-summary-heading::before { content: "−"; }
.cash-summary-heading span { margin-left: auto; }
.cash-summary-heading h2 { margin: 0; font-size: 1rem; }
.cash-summary-heading span, .cash-summary-note { font-size: 0.75rem; color: var(--outlay-muted); }
.cash-summary-note { margin: 0.35rem 0 0.75rem; }
.cash-summary-totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; }
.cash-summary-total { padding: 0.5rem; border: 1px solid var(--outlay-border); border-radius: 0.35rem; }
.cash-summary-total span { display: block; font-size: 0.6875rem; color: var(--outlay-muted); }
.cash-summary-total strong { font-size: 0.875rem; }
.cash-summary-controls { max-width: 300px; margin: 1rem 0 0.5rem; }
.cash-summary-chart { position: relative; }
.cash-summary-details { margin-top: 0.75rem; font-size: 0.75rem; }
.cash-summary-details summary { cursor: pointer; font-weight: 600; }
.cash-summary-help p { font-size: 0.75rem; }
.cash-summary-table-scroll { overflow-x: auto; margin-top: 0.5rem; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.4rem; border: 1px solid var(--outlay-border); text-align: right; white-space: nowrap; }
th:first-child { text-align: left; }
</style>
