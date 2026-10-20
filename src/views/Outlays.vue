<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useStore } from "vuex"
import { apiDelete } from "@/api"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialSelect from "@/components/MaterialSelect.vue"
import CashBoxesSummary from "@/components/CashBoxesSummary.vue"
import MaterialPagination from "@/components/MaterialPagination.vue"
import TableSummary from "@/components/TableSummary.vue"
import OutlayWorkspace from "@/components/OutlayWorkspace.vue"
import OutlayPageLinks from "@/components/OutlayPageLinks.vue"
import { downloadPeriodPdf } from "@/services/outlayDocumentsService"
import { staffLabel } from "@/views/components/outlayTabs"
import { serverMessage } from "@/services/outlayTabsService"
import { fetchClientTypes } from "@/services/clientTypesService"
import {
  fetchOutlays,
  fetchStatusesForOutlays,
  fetchUsersForOutlays,
} from "@/services/outlaysService"
import { fetchPaymentMethods } from "@/services/paymentMethodsService"
import Filter from "@/views/components/Filter.vue"
import { buildQueryParams } from "@/views/components/buildQueryParams"
import { useDataList } from "@/views/components/useDataList"
import { useFiltering } from "@/views/components/useFiltering"
import { usePagination } from "@/views/components/usePagination"
import { outlayStores } from "@/views/components/outlayStores"
import { currentMonthRange } from "@/views/components/cashSummary"

const router = useRouter()
const store = useStore()
const userOptions = ref([])
const statusOptions = ref([])
const clientTypeOptions = ref([])
const paymentMethodOptions = ref([])
const activeTab = ref("outlays")
const visitedTabs = ref(new Set(["outlays"]))
const tabRevision = ref(0)
const pdfBusy = ref(false)
const pdfError = ref("")
const tabs = [
  { value: "outlays", label: "Сметы" },
  { value: "receipts", label: "Поступления" },
  { value: "operations", label: "Операции" },
  { value: "distribution", label: "Распределение" },
  { value: "self", label: "Самовывоз/самовозврат" },
  { value: "returns", label: "Возвраты" },
  { value: "text", label: "Текст" },
]
const selectTab = (value) => { visitedTabs.value.add(value); activeTab.value = value }
const refreshTabs = () => { tabRevision.value++; summaryRevision.value++; getList(currentPage.value, pageSize.value) }
const exportPdf = async () => {
  if (pdfBusy.value) return
  const period = getFilterParams()
  if (!period.date_start_from || !period.date_start_to || period.date_start_from > period.date_start_to) {
    pdfError.value = "Укажите корректные даты заказа от и до для экспорта."
    return
  }
  pdfBusy.value = true; pdfError.value = ""
  try {
    await downloadPeriodPdf({ date_from: period.date_start_from, date_to: period.date_start_to,
      ...(subdivisionId.value ? { subdivision_id: subdivisionId.value } : {}) })
  } catch (error) { pdfError.value = serverMessage(error) }
  finally { pdfBusy.value = false }
}

const subdivisionId = computed(
  () => store.getters["subdivisions/subdivision"] ?? null,
)
const sortField = ref(null)
const sortDirection = ref("asc")
const sortDirectionOptions = [
  { value: "asc", label: "По возрастанию" },
  { value: "desc", label: "По убыванию" },
]
const sortOptions = [
  { value: "execution_date", label: "Дата заказа" },
  { value: "return_date", label: "Дата возврата" },
  { value: "id", label: "ID сметы" },
  { value: "title", label: "Название" },
  { value: "address", label: "Адрес" },
  { value: "recipient_name", label: "Получатель" },
  { value: "prepayment_amount", label: "Предоплата" },
  { value: "prepayment_date", label: "Дата предоплаты" },
  { value: "total_cost", label: "Итого" },
  { value: "is_paid", label: "Оплачено" },
  { value: "date_of_paid", label: "Дата оплаты" },
  { value: "status_id", label: "Статус" },
  { value: "creator_id", label: "Создатель" },
]
const sortParam = computed(() =>
  sortField.value
    ? `${sortDirection.value === "desc" ? "-" : ""}${sortField.value}`
    : null,
)
const tableColumns = [
  "Дата заказа / возврата",
  "Примечание ко времени",
  "ID / статус",
  "Исполнители",
  "Контрагент / получатель",
  "Предоплата",
  "Оплата",
  "Склады",
  "Документы",
  "Чек",
  "Создатель / ответственные",
]
const { updateFilters, getFilterParams } = useFiltering()
const defaultPeriod = currentMonthRange()
updateFilters(defaultPeriod)
const reportPeriod = computed(() => getFilterParams())
const summaryRevision = ref(0)
const {
  pageSize,
  paginationMeta,
  currentPage,
  updatePaginationMeta,
  canGoToPage,
  changePageSize,
  resetToFirstPage,
} = usePagination(100)
const {
  items: outlays,
  isLoading,
  requestError,
  requestSuccess,
  loadData,
  showSuccess,
  showError,
  clearMessages,
} = useDataList(fetchOutlays)
const outlaysTotal = computed(() =>
  outlays.value.reduce((total, outlay) => {
    const amount = Number(outlay.total_cost)
    return total + (Number.isFinite(amount) ? Math.round(amount * 100) : 0)
  }, 0) / 100,
)

const inputOptions = computed(() => [
  { name: "date_start_from", placeholder: "Дата заказа от", type: "date", value: defaultPeriod.date_start_from },
  { name: "date_start_to", placeholder: "Дата заказа до", type: "date", value: defaultPeriod.date_start_to },
  { name: "title", placeholder: "Название", type: "text" },
  {
    name: "creator_id",
    placeholder: "Создатель",
    type: "select",
    options: userOptions.value,
  },
  {
    name: "status_id",
    placeholder: "Статус",
    type: "select",
    options: statusOptions.value,
  },
  {
    name: "client_type_id",
    placeholder: "Тип клиента",
    type: "select",
    options: clientTypeOptions.value,
  },
  { name: "partner_entity", placeholder: "Контрагент", type: "text" },
  { name: "recipient_name", placeholder: "Получатель", type: "text" },
  { name: "recipient_phone", placeholder: "Телефон получателя", type: "text" },
  {
    name: "is_paid",
    placeholder: "Оплата",
    type: "select",
    options: [
      { value: "1", label: "Оплачено" },
      { value: "0", label: "Не оплачено" },
    ],
  },
  {
    name: "payment_method_id",
    placeholder: "Способ оплаты",
    type: "select",
    options: paymentMethodOptions.value,
  },
  { name: "total_cost", placeholder: "Итого", type: "text" },
])

const normalizeOptions = (items, labelGetter) =>
  items.map((item) => ({ value: item.id, label: labelGetter(item) }))

const loadReferences = async () => {
  const [users, statuses, clientTypes, paymentMethods] = await Promise.all([
    fetchUsersForOutlays(),
    fetchStatusesForOutlays(),
    fetchClientTypes(),
    fetchPaymentMethods({ page_size: 500 }),
  ])

  userOptions.value = normalizeOptions(
    users,
    (user) =>
      [user.firstname, user.lastname].filter(Boolean).join(" ") ||
      user.email ||
      `ID ${user.id}`,
  )
  statusOptions.value = normalizeOptions(
    statuses,
    (status) => status.title ?? status.name ?? `ID ${status.id}`,
  )
  clientTypeOptions.value = normalizeOptions(
    clientTypes,
    (type) => type.title ?? type.label ?? `ID ${type.id}`,
  )
  paymentMethodOptions.value = normalizeOptions(
    paymentMethods?.data ?? [],
    (method) => method.title ?? `ID ${method.id}`,
  )
}

const getList = async (page = 1, perPage = pageSize.value) => {
  const filters = { ...getFilterParams() }
  if (subdivisionId.value) filters.subdivision_id = subdivisionId.value

  await loadData(
    buildQueryParams({ page, perPage, filters, sort: sortParam.value }),
    (response) => {
      if (response?.pagination)
        updatePaginationMeta(response.pagination, page, perPage)
    },
  )
}

const handleFilterChange = async (values) => {
  updateFilters(values)
  resetToFirstPage()
  await getList(1, pageSize.value)
}

watch(sortParam, async () => {
  resetToFirstPage()
  await getList(1, pageSize.value)
})

const goToPage = async (page) => {
  if (canGoToPage(page, isLoading.value)) await getList(page, pageSize.value)
}

const handlePageSizeChange = async (size) => {
  const nextSize = changePageSize(size)
  if (nextSize) await getList(1, nextSize)
}

const handleEdit = (outlay) => {
  if (!subdivisionId.value) return
  router.push(`/outlays/${outlay.id}/edit`)
}

const handleCopy = (outlay) => {
  if (!subdivisionId.value) return
  router.push({ path: "/outlays/create", query: { copy_from: outlay.id } })
}

const handleDelete = async (outlay) => {
  if (!confirm(`Удалить смету №${outlay.id} «${outlay.title}»?`)) return

  try {
    isLoading.value = true
    clearMessages()
    const response = await apiDelete(`admin/outlays/${outlay.id}`)
    if (response?.status === true) {
      summaryRevision.value += 1
      await getList(currentPage.value, pageSize.value)
      showSuccess(`Смета №${outlay.id} удалена.`)
      return
    }
    showError(response?.message ?? "Не удалось удалить смету.")
  } catch (error) {
    console.error("Ошибка при удалении сметы", error)
    showError(error?.response?.data?.message ?? "Не удалось удалить смету.")
  } finally {
    isLoading.value = false
  }
}

const datePart = (value) =>
  value ? String(value).replace(" ", "T").slice(0, 10) : "—"
const timePart = (value) => {
  const normalized = value ? String(value).replace(" ", "T") : ""
  return normalized.includes("T")
    ? normalized.slice(11, 16) || "--:--"
    : "--:--"
}
const money = (value) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
const entityTitle = (entity) =>
  entity?.title ??
  entity?.name ??
  entity?.organization_name ??
  entity?.contact_name ??
  null
const userTitle = (user, fallback = null) =>
  entityTitle(user) ??
  ([user?.firstname, user?.lastname].filter(Boolean).join(" ") ||
    fallback ||
    "—")
const userNames = computed(
  () =>
    new Map(userOptions.value.map((user) => [String(user.value), user.label])),
)
const creatorTitle = (outlay) =>
  userTitle(outlay.creator, userNames.value.get(String(outlay.creator_id)))
const responsibleTitle = (outlay) => {
  const workers = outlay.responsible_workers ?? []
  return Array.isArray(workers) && workers.length
    ? workers
        .map((worker) =>
          typeof worker === "object" && worker !== null
            ? userTitle(worker, userNames.value.get(String(worker.id)))
            : userNames.value.get(String(worker)) ?? `ID ${worker}`,
        )
        .join(", ")
    : "—"
}
const statusTitle = (outlay) =>
  entityTitle(outlay.status) ??
  statusOptions.value.find(
    (status) => String(status.value) === String(outlay.status_id),
  )?.label ??
  "—"
const methodTitle = (method, id) =>
  entityTitle(method) ??
  paymentMethodOptions.value.find(
    (option) => String(option.value) === String(id),
  )?.label ??
  "—"
const dateTime = (value) =>
  value ? `${datePart(value)} ${timePart(value)}` : "—"
const isPaid = (outlay) =>
  outlay.is_paid === true || Number(outlay.is_paid) === 1
const clientData = (outlay) => {
  const client = outlay.client ?? outlay.individual ?? outlay.legal_entity
  return {
    name: entityTitle(client) ?? outlay.client_name ?? "—",
    phone: client?.phone ?? client?.mobile_phone ?? outlay.client_phone ?? "",
  }
}
const documentsTitle = (outlay) => {
  const documents = outlay.documents
  if (Array.isArray(documents))
    return documents.length ? `${documents.length} шт.` : "Нет"
  return documents ?? "Нет"
}

onMounted(async () => {
  try { await Promise.all([loadReferences(), getList(1, pageSize.value)]) }
  catch (error) { showError(serverMessage(error)) }
})

watch(subdivisionId, () => {
  resetToFirstPage()
  getList(1, pageSize.value)
})
</script>

<template>
  <section class="outlays-page">
    <header class="outlays-header">
      <div>
        <h1>Сметы</h1>
        <p>Управление заказами и сметами</p>
      </div>
      <MaterialButton v-if="subdivisionId" color="success" @click="router.push('/outlays/create')">
        Создать смету
      </MaterialButton>
    </header>

    <CashBoxesSummary
      :subdivision-id="subdivisionId"
      :date-from="reportPeriod.date_start_from || ''"
      :date-to="reportPeriod.date_start_to || ''"
      :refresh-key="summaryRevision"
    />

    <nav class="outlay-tabs" aria-label="Разделы смет">
      <button v-for="tab in tabs" :key="tab.value" type="button" :class="{ 'is-active': activeTab === tab.value }" :aria-pressed="activeTab === tab.value" @click="selectTab(tab.value)">{{ tab.label }}</button>
    </nav>
    <template v-for="tab in tabs.filter(tab => tab.value !== 'outlays')" :key="tab.value">
      <OutlayWorkspace v-if="visitedTabs.has(tab.value)" v-show="activeTab === tab.value" :tab="tab.value" :subdivision-id="subdivisionId" :period="reportPeriod" :refresh-key="tabRevision" @changed="refreshTabs" />
    </template>

    <div v-show="activeTab === 'outlays'">

    <div class="outlay-list-controls">
      <Filter
        class="outlay-filter"
        :input-options="inputOptions"
        @change="handleFilterChange"
      />

      <div class="outlay-sorting">
        <MaterialButton type="button" color="success" variant="outline" :disabled="pdfBusy" @click="exportPdf">{{ pdfBusy ? 'Подготовка PDF...' : 'Экспорт в PDF' }}</MaterialButton>
        <div class="col-12 col-md-2">
          <MaterialSelect
            id="outlay-sort-field"
            v-model="sortField"
            label="Сортировать по"
            placeholder="Порядок по умолчанию"
            :options="sortOptions"
            :disabled="isLoading"
          />
        </div>
        <div class="col-12 col-md-2">
          <MaterialSelect
            id="outlay-sort-direction"
            v-model="sortDirection"
            label="Направление"
            :options="sortDirectionOptions"
            :disabled="!sortField || isLoading"
          />
        </div>
      </div>
      <p v-if="pdfError" class="text-danger" role="alert">{{ pdfError }}</p>
    </div>

    <div v-if="requestError" class="alert alert-danger">{{ requestError }}</div>
    <div v-if="requestSuccess" class="alert alert-success">
      {{ requestSuccess }}
    </div>
    <div v-if="isLoading" class="text-center py-4">
      <span class="spinner-border text-success"></span>
    </div>

    <div v-else>
      <TableSummary class="mb-2" :pagination="paginationMeta" />
      <div class="outlay-list-summary">
        <p>Сумма смет: <strong>{{ money(outlaysTotal) }}</strong></p>
      </div>
      <p v-if="!outlays.length" class="text-muted">Сметы не найдены.</p>
      <div v-else class="outlays-table">
        <div class="outlay-table-heading">
          <div class="outlay-main-row">
            <strong>Название</strong><strong>Адрес</strong>
          </div>
          <div class="outlay-details-row">
            <strong
              v-for="column in tableColumns"
              :key="column"
              class="outlay-detail-cell"
              >{{ column }}</strong
            >
          </div>
          <strong class="outlay-actions-heading">Действия</strong>
        </div>
        <article v-for="outlay in outlays" :key="outlay.id" class="outlay-card">
          <div class="outlay-main-row">
            <p :title="outlay.title">{{ outlay.title || "—" }}</p>
            <p :title="outlay.address">{{ outlay.address || "—" }}</p>
          </div>
          <div class="outlay-details-row">
            <div class="outlay-detail-cell">
              <p :title="'Дата заказа: ' + dateTime(outlay.execution_date)">
                {{ dateTime(outlay.execution_date) }}
              </p>
              <p
                v-if="outlay.return_date || outlay['return date']"
                :title="
                  'Дата возврата: ' +
                  dateTime(outlay.return_date ?? outlay['return date'])
                "
              >
                {{ dateTime(outlay.return_date ?? outlay["return date"]) }}
              </p>
            </div>
            <div class="outlay-detail-cell">
              <p :title="outlay.date_comment">
                {{ outlay.date_comment || "—" }}
              </p>
            </div>
            <div class="outlay-detail-cell">
              <p>№{{ outlay.id }}</p>
              <p :title="statusTitle(outlay)">{{ statusTitle(outlay) }}</p>
            </div>
            <div class="outlay-detail-cell">
              <p :title="'Исполнители заказа: ' + staffLabel(outlay.performers)">{{ staffLabel(outlay.performers) }}</p>
              <p :title="'Исполнители возврата: ' + staffLabel(outlay.return_performers)">{{ staffLabel(outlay.return_performers) }}</p>
            </div>
            <div class="outlay-detail-cell">
              <p
                :title="
                  'Контрагент: ' +
                  clientData(outlay).name +
                  ' ' +
                  clientData(outlay).phone
                "
              >
                {{ clientData(outlay).name
                }}<span v-if="clientData(outlay).phone">
                  · {{ clientData(outlay).phone }}</span
                >
              </p>
              <p
                :title="
                  'Получатель: ' +
                  (outlay.recipient_name || '—') +
                  ' ' +
                  (outlay.recipient_phone || '')
                "
              >
                {{ outlay.recipient_name || "—"
                }}<span v-if="outlay.recipient_phone">
                  · {{ outlay.recipient_phone }}</span
                >
              </p>
            </div>
            <div class="outlay-detail-cell">
              <p>{{ money(outlay.prepayment_amount ?? 0) }}</p>
              <p
                :title="
                  datePart(outlay.prepayment_date) +
                  ' · ' +
                  methodTitle(
                    outlay.prepayment_method,
                    outlay.prepayment_method_id,
                  )
                "
              >
                {{ datePart(outlay.prepayment_date) }} ·
                {{
                  methodTitle(
                    outlay.prepayment_method,
                    outlay.prepayment_method_id,
                  )
                }}
              </p>
            </div>
            <div class="outlay-detail-cell">
              <p>{{ money(outlay.total_cost) }}</p>
              <p
                v-if="isPaid(outlay)"
                :title="
                  datePart(outlay.date_of_paid) +
                  ' · ' +
                  methodTitle(outlay.payment_method, outlay.payment_method_id)
                "
              >
                {{ datePart(outlay.date_of_paid) }} ·
                {{
                  methodTitle(outlay.payment_method, outlay.payment_method_id)
                }}
              </p>
              <p v-else>Не оплачено</p>
            </div>
            <div class="outlay-detail-cell outlay-stores">
              <span v-for="store in outlayStores(outlay)" :key="store.id ?? store.title" class="badge bg-primary" :title="store.title">{{ store.title }}</span>
              <p v-if="!outlayStores(outlay).length">—</p>
            </div>
            <div class="outlay-detail-cell">
              <p :title="'Документы: ' + documentsTitle(outlay)">
                {{ documentsTitle(outlay) }}
              </p>
            </div>
            <div class="outlay-detail-cell">
              <p :title="'Чек: ' + (outlay.cheque ?? outlay.check ?? 'Нет')">
                {{ outlay.cheque ?? outlay.check ?? "Нет" }}
              </p>
            </div>
            <div class="outlay-detail-cell">
              <p :title="'Создатель: ' + creatorTitle(outlay)">
                {{ creatorTitle(outlay) }}
              </p>
              <p :title="'Ответственные: ' + responsibleTitle(outlay)">
                {{ responsibleTitle(outlay) }}
              </p>
            </div>
          </div>
          <div class="outlay-actions">
            <OutlayPageLinks :item="outlay" />
            <MaterialButton
              v-if="subdivisionId"
              color="info"
              variant="outline"
              size="sm"
              title="Редактировать"
              aria-label="Редактировать смету"
              @click="handleEdit(outlay)"
              ><i class="material-icons outlay-button-icon"
                >edit</i
              ></MaterialButton
            >
            <MaterialButton
              v-if="subdivisionId"
              color="info"
              variant="outline"
              size="sm"
              title="Скопировать"
              aria-label="Скопировать смету"
              @click="handleCopy(outlay)"
              ><i class="material-icons outlay-button-icon">content_copy</i></MaterialButton
            >
            <MaterialButton
              color="danger"
              variant="outline"
              size="sm"
              title="Удалить"
              aria-label="Удалить смету"
              @click="handleDelete(outlay)"
              ><i class="material-icons outlay-button-icon"
                >delete</i
              ></MaterialButton
            >
          </div>
        </article>
      </div>

      <MaterialPagination
        class="mt-3"
        :pagination="paginationMeta"
        :page-size-options="[20, 50, 100]"
        color="success"
        @change="goToPage"
        @pageSizeChange="handlePageSizeChange"
      />
    </div>

    </div>
  </section>
</template>

<style scoped lang="scss">
:global(.main-content:has(.outlays-page)) {
  overflow-x: clip !important;
  overflow-y: visible !important;
}
.outlays-page {
  padding: 1.5rem;
}
.outlay-tabs { display: flex; flex-wrap: wrap; gap: .25rem; padding: .3rem; margin: 1rem 0; border: 1px solid var(--outlay-border); border-radius: .5rem; }
.outlay-tabs button { padding: .5rem .75rem; border: 0; border-radius: .35rem; background: transparent; color: var(--outlay-text); font-size: .8125rem; font-weight: 600; }
.outlay-tabs button.is-active { background: var(--outlay-heading); box-shadow: 0 2px 5px rgba(0,0,0,.12); }
.outlays-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.outlays-header h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}
.outlays-header p {
  margin: 0.25rem 0 0;
  color: var(--outlay-muted);
}
.outlay-filter {
  display: grid !important;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.75rem;
}
.outlay-filter :deep(.input-group),
.outlay-filter :deep(.form-select) {
  width: 100%;
}
.outlay-list-controls :deep(.form-select:disabled) {
  background-color: var(--outlay-surface) !important;
  color: var(--outlay-muted) !important;
  border-color: var(--outlay-border);
}
.outlay-sorting {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.75rem 0 1rem;
}
.outlays-table {
  --outlay-columns: minmax(0, 0.8fr) minmax(0, 2.2fr) minmax(0, 0.5fr)
    minmax(0, 1fr) minmax(0, 1.7fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr)
    minmax(0, 0.65fr) minmax(0, 0.5fr) minmax(0, 0.8fr);
  --outlay-actions-width: 4.5rem;
  width: 100%;
  color: var(--outlay-text);
}
.outlay-list-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  margin-bottom: 0.5rem;
  color: var(--outlay-text);
}
.outlay-list-summary p {
  margin: 0;
  font-size: 0.875rem;
}
.outlay-card,
.outlay-table-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--outlay-actions-width);
  grid-template-rows: auto 1fr;
  width: 100%;
  border: 1px solid var(--outlay-border);
  background: var(--outlay-surface);
}
.outlay-card {
  margin-bottom: 0.3rem;
  border-radius: 0.4rem;
}
.outlay-table-heading {
  position: sticky;
  top: 0;
  z-index: 20;
  margin-bottom: 0.3rem;
  border-radius: 0.4rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
  background: var(--outlay-heading);
}
.outlay-main-row {
  grid-column: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  min-width: 0;
  padding: 0.25rem 0.4rem;
  border-bottom: 1px solid var(--outlay-border);
}
.outlay-main-row p,
.outlay-detail-cell p {
  overflow: hidden;
  margin: 0;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.outlay-main-row p {
  font-size: 0.6875rem;
  line-height: 1.3;
}
.outlay-main-row > :first-child {
  padding-right: 5px;
}
.outlay-main-row > :last-child {
  padding-left: 5px;
  border-left: 1px solid var(--outlay-border);
}
.outlay-details-row {
  grid-column: 1;
  display: grid;
  grid-template-columns: var(--outlay-columns);
  min-width: 0;
}
.outlay-detail-cell {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-width: 0;
  padding: 0.25rem 0.35rem;
  border-right: 1px solid var(--outlay-border);
}
.outlay-detail-cell:last-child {
  border-right: 0;
}
.outlay-stores { align-items: flex-start; gap: 0.2rem; }
.outlay-stores .badge { max-width: 100%; font-size: 0.625rem; white-space: normal; overflow-wrap: anywhere; }
.outlay-detail-cell p {
  font-size: 0.625rem;
  line-height: 1.4;
}
.outlay-table-heading strong {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.35;
}
.outlay-actions,
.outlay-actions-heading {
  grid-column: 2;
  grid-row: 1 / 3;
  display: grid;
  align-items: center;
  align-content: center;
  justify-content: center;
  border-left: 1px solid var(--outlay-border);
}
.outlay-actions {
  grid-template-columns: repeat(2, auto);
  gap: 0.2rem;
  padding: 0.3rem;
}
.outlay-actions :deep(.btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.3rem;
}
.outlay-button-icon {
  font-size: 0.9rem !important;
}
@media (max-width: 1199.98px) {
  .outlay-filter {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .outlays-table {
    --outlay-columns: repeat(6, minmax(0, 1fr));
  }
}
@media (max-width: 767.98px) {
  .outlays-page {
    padding: 0.75rem;
  }
  .outlays-table {
    --outlay-actions-width: 3.5rem;
    --outlay-columns: repeat(3, minmax(0, 1fr));
  }
  .outlay-table-heading strong {
    font-size: 0.5625rem;
    overflow-wrap: anywhere;
  }
  .outlay-detail-cell {
    padding: 0.2rem 0.1rem;
  }
  .outlay-actions {
    padding: 0.2rem;
    gap: 0.1rem;
  }
  .outlay-actions :deep(.btn) {
    padding: 0.15rem 0.2rem;
  }
}
@media (max-width: 575.98px) {
  .outlays-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .outlay-filter {
    grid-template-columns: 1fr;
  }
}
</style>
