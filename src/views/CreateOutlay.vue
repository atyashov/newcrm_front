<script setup>
/* global BigInt */

import { computed, onMounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useStore } from "vuex"
import Multiselect from "@vueform/multiselect"
import "@vueform/multiselect/themes/default.css"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialCheckbox from "@/components/MaterialCheckbox.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import OutlayDocuments from "@/components/OutlayDocuments.vue"
import OutlayAudit from "@/components/OutlayAudit.vue"
import OutlayComposition from "@/components/OutlayComposition.vue"
import { fetchCashBoxes } from "@/services/cashBoxesService"
import { useProductAvailability } from "@/views/components/useProductAvailability"
import { normalizeGroups, serializeGroups, compositionError, discountedCents, formatMoney, validDecimal, copyOutlayForCreate } from "@/views/components/outlayComposition"
import {
  fetchIndividualById,
  fetchIndividuals,
} from "@/services/individualsService"
import {
  fetchLegalEntities,
  fetchLegalEntityById,
} from "@/services/legalEntitiesService"
import {
  createOutlay,
  fetchOutlayById,
  fetchUsersForOutlays,
  fetchStatusesForOutlays,
  updateOutlay,
} from "@/services/outlaysService"

const route = useRoute()
const router = useRouter()
const store = useStore()
const isLoading = ref(false)
const isSaving = ref(false)
const requestError = ref("")
const invalidFields = ref(new Set())
const currentUserId = computed(() => Number(store.state.user.user?.id) || null)
const fieldTitles = {
  execution_date: "Дата и время заказа", title: "Название", partner_entity: "Контрагент",
  client_id: "Клиент", creator_id: "Создатель", status_id: "Статус сметы",
  return_date: "Дата и время возврата", date_of_paid: "Дата окончательной оплаты",
  payment_cash_box_id: "Касса окончательной оплаты", prepayment_amount: "Размер предоплаты",
  prepayment_date: "Дата и время предоплаты", prepayment_cash_box_id: "Касса предоплаты",
  subdivision_id: "Подразделение", groups: "Товары сметы", discount: "Скидка",
}
const validationMessage = computed(() => Array.from(invalidFields.value)
  .map((field) => fieldTitles[field] || field).join(", "))
const userOptions = ref([])
const cashBoxOptions = ref([])
const statusOptions = ref([])
const groups = ref([])
const compositionMessage = ref("")
const totals = computed(() => discountedCents(groups.value, formState.percent_discount, formState.discount_amount))
const selectedStatus = computed(() => statusOptions.value.find(
  (status) => String(status.value) === String(formState.status_id),
))
const hasRentalProducts = computed(() => groups.value.some((group) =>
  group.items.some((item) => {
    const stock = productAvailability.value[item.product.value]
    return stock ? stock.is_rent && !stock.unlimited && !stock.is_service : item.product.isRent && !item.product.unlimited
  }),
))

const partnerEntityOptions = [
  { value: "individual", label: "Физическое лицо" },
  { value: "legal", label: "Юридическое лицо" },
]

const outlayId = computed(() => route.params.id ?? null)
const isEditMode = computed(() => Boolean(outlayId.value))
const subdivisionId = computed(
  () => store.getters["subdivisions/subdivision"] ?? null,
)
const formSubdivisionId = ref(subdivisionId.value)
const subdivisionMismatch = computed(() => String(formSubdivisionId.value) !== String(subdivisionId.value))
watch(subdivisionId, (value) => {
  if (!isEditMode.value && !groups.value.length) formSubdivisionId.value = value
  loadStatusOptions(value)
})

const formState = reactive({
  execution_date: "",
  date_comment: "",
  return_date_comment: "",
  self_pickup: false,
  self_return: false,
  title: "",
  address: "",
  partner_entity: null,
  client_id: null,
  percent_discount: "",
  discount_amount: "",
  return_date: "",
  creator_id: currentUserId.value,
  status_id: null,
  responsible_workers: [],
  is_paid: false,
  date_of_paid: "",
  payment_cash_box_id: null,
  prepayment: false,
  prepayment_amount: "",
  prepayment_cash_box_id: null,
  prepayment_date: "",
})

const normalizeDateTime = (value) =>
  value ? String(value).replace(" ", "T").slice(0, 16) : ""

const {
  items: productAvailability,
  loading: availabilityLoading,
  error: availabilityError,
  refresh: refreshAvailability,
} = useProductAvailability({
  groups,
  subdivisionId: formSubdivisionId,
  outlayId,
  startsAt: computed(() => formState.execution_date),
  endsAt: computed(() => formState.return_date),
  ready: computed(() => !isLoading.value),
})

const userLabel = (user) =>
  [user.firstname, user.lastname].filter(Boolean).join(" ") ||
  user.name ||
  user.email ||
  `ID ${user.id}`

const makeClientOption = (client = {}) => {
  const title =
    client.title ??
    client.name ??
    client.organization_name ??
    client.contact_name ??
    `ID ${client.id}`
  const phone = client.phone ?? client.mobile_phone ?? ""

  return {
    value: client.id,
    title,
    phone,
    label: phone ? `${title} — ${phone}` : title,
  }
}

const searchClients = async (query) => {
  const title = query?.trim()
  if (!formState.partner_entity || !title || title.length < 3) return []

  try {
    const isLegalEntity = formState.partner_entity === "legal"
    const fetchClients = isLegalEntity
      ? fetchLegalEntities
      : fetchIndividuals
    const filters = {
      page: 1,
      page_size: 50,
      [isLegalEntity ? "organization_name" : "name"]: title,
    }
    const response = await fetchClients(filters)

    return (response?.data ?? []).map(makeClientOption)
  } catch (error) {
    console.error("Не удалось загрузить клиентов", error)
    return []
  }
}

const handlePartnerEntityChange = () => {
  formState.client_id = null
}

const loadCashBoxOptions = async () => {
  const cashBoxes = await fetchCashBoxes({ page_size: 500 })
  cashBoxOptions.value = (cashBoxes?.data ?? []).map((cashBox) => ({
    value: cashBox.id,
    label: cashBox.payment_method?.title
      ? `${cashBox.title} (${cashBox.payment_method.title})`
      : cashBox.title ?? `Касса №${cashBox.id}`,
  }))
}

const loadStatusOptions = async (currentSubdivisionId) => {
  if (!currentSubdivisionId) {
    statusOptions.value = []
    return
  }

  const statuses = await fetchStatusesForOutlays({
    subdivision_id: currentSubdivisionId,
  })
  statusOptions.value = statuses.map((status) => ({
    value: status.id,
    label: status.title ?? status.name ?? `ID ${status.id}`,
    affectsStock: status.affects_stock === true || Number(status.affects_stock) === 1,
  }))
}

const loadReferences = async () => {
  const [users] = await Promise.all([
    fetchUsersForOutlays(),
    loadStatusOptions(subdivisionId.value),
    loadCashBoxOptions(),
  ])

  userOptions.value = users.map((user) => ({ value: Number(user.id), label: userLabel(user) }))
  if (currentUserId.value && !userOptions.value.some((user) => user.value === currentUserId.value)) {
    userOptions.value.push({ value: currentUserId.value, label: userLabel(store.state.user.user) })
  }
}

const applyData = async (item = {}) => {
  formSubdivisionId.value = item.subdivision_id ?? subdivisionId.value
  groups.value = normalizeGroups(item.groups ?? [])
  formState.execution_date = normalizeDateTime(item.execution_date)
  formState.date_comment = item.date_comment ?? ""
  formState.return_date_comment = item.return_date_comment ?? ""
  formState.self_pickup = Boolean(Number(item.self_pickup))
  formState.self_return = Boolean(Number(item.self_return))
  formState.title = item.title ?? ""
  formState.address = item.address ?? ""
  formState.partner_entity = ["individual", "legal"].includes(item.partner_entity)
    ? item.partner_entity
    : null
  formState.percent_discount = String(item.percent_discount ?? "")
  formState.discount_amount = String(item.discount_amount ?? "")
  formState.return_date = normalizeDateTime(item.return_date ?? item["return date"])
  formState.creator_id = Number(item.creator_id ?? item.creator?.id) || currentUserId.value
  formState.status_id = item.status_id ?? null
  formState.responsible_workers = item.responsible_workers ?? []
  formState.is_paid = Boolean(item.is_paid)
  formState.date_of_paid = item.date_of_paid ?? ""
  formState.payment_cash_box_id = item.payment_cash_box_id ?? item.payment_cash_box?.id ?? null
  formState.prepayment = Boolean(item.prepayment)
  formState.prepayment_amount = String(item.prepayment_amount ?? "")
  formState.prepayment_cash_box_id = item.prepayment_cash_box_id ?? item.prepayment_cash_box?.id ?? null
  formState.prepayment_date = normalizeDateTime(item.prepayment_date)

  const embeddedClient = item.client ?? item.individual ?? item.legal_entity
  if (embeddedClient) {
    formState.client_id = makeClientOption(embeddedClient)
    return
  }

  if (item.client_id) {
    const client =
      formState.partner_entity === "legal"
        ? await fetchLegalEntityById(item.client_id)
        : await fetchIndividualById(item.client_id)
    formState.client_id = makeClientOption(client)
  } else {
    formState.client_id = null
  }
}

const loadOutlay = async () => {
  const sourceId = isEditMode.value ? outlayId.value : route.query.copy_from
  if (!sourceId) return
  const source = await fetchOutlayById(sourceId)
  await applyData(isEditMode.value ? source : copyOutlayForCreate(source, currentUserId.value))
}

const validate = () => {
  const invalid = new Set()
  compositionMessage.value = compositionError(groups.value)
  if (compositionMessage.value) invalid.add("groups")
  if (subdivisionMismatch.value) invalid.add("subdivision_id")
  if ((formState.percent_discount !== "" && !validDecimal(formState.percent_discount, 2, 0, 100)) ||
      (formState.discount_amount !== "" && !validDecimal(formState.discount_amount, 2, 0, 9999999999.99)) || totals.value.total < 0n) {
    invalid.add("discount")
    compositionMessage.value = "Проверьте скидку: процент от 0 до 100, сумма не больше стоимости товаров."
  }
  if (!formState.execution_date) invalid.add("execution_date")
  if (!formState.title.trim()) invalid.add("title")
  if (!formState.partner_entity) invalid.add("partner_entity")
  if (!formState.client_id) invalid.add("client_id")
  if (!formState.creator_id) invalid.add("creator_id")
  if (!formState.status_id) invalid.add("status_id")
  if (selectedStatus.value?.affectsStock && hasRentalProducts.value && !formState.return_date) {
    invalid.add("return_date")
  }
  if (!subdivisionId.value) invalid.add("subdivision_id")
  if (formState.is_paid && !formState.date_of_paid) invalid.add("date_of_paid")
  if (formState.is_paid && !formState.payment_cash_box_id) invalid.add("payment_cash_box_id")
  if (formState.prepayment && !validDecimal(formState.prepayment_amount, 2, 0.01, 9999999999.99)) invalid.add("prepayment_amount")
  if (formState.prepayment && !formState.prepayment_date) invalid.add("prepayment_date")
  if (formState.prepayment && !formState.prepayment_cash_box_id) invalid.add("prepayment_cash_box_id")
  if (formState.prepayment && validDecimal(formState.prepayment_amount, 2, 0.01, 9999999999.99) &&
      BigInt(Math.round(Number(formState.prepayment_amount) * 100)) > totals.value.total) {
    invalid.add("prepayment_amount")
  }
  invalidFields.value = invalid
  return invalid.size === 0
}

const handleSubmit = async () => {
  if (isSaving.value || !validate()) return

  const selectedClient = formState.client_id
  const payload = {
    execution_date: formState.execution_date,
    date_comment: formState.date_comment.trim() || null,
    return_date_comment: formState.return_date_comment.trim() || null,
    self_pickup: formState.self_pickup,
    self_return: formState.self_return,
    title: formState.title.trim(),
    address: formState.address.trim() || null,
    subdivision_id: Number(subdivisionId.value),
    client_type_id: null,
    client_id: Number(selectedClient?.value),
    partner_entity: formState.partner_entity,
    percent_discount:
      formState.percent_discount === "" ? null : Number(formState.percent_discount),
    discount_amount:
      formState.discount_amount === "" ? null : Number(formState.discount_amount),
    return_date: formState.return_date || null,
    creator_id: Number(formState.creator_id),
    status_id: Number(formState.status_id),
    responsible_workers: formState.responsible_workers.map(Number),
    groups: serializeGroups(groups.value),
    is_paid: Boolean(formState.is_paid),
    date_of_paid: formState.is_paid ? formState.date_of_paid || null : null,
    payment_cash_box_id: formState.is_paid
      ? Number(formState.payment_cash_box_id) || null
      : null,
    prepayment: Boolean(formState.prepayment),
    prepayment_amount: formState.prepayment
      ? Number(formState.prepayment_amount) || 0
      : null,
    prepayment_cash_box_id: formState.prepayment
      ? Number(formState.prepayment_cash_box_id) || null
      : null,
    prepayment_date: formState.prepayment
      ? formState.prepayment_date || null
      : null,
  }

  try {
    isSaving.value = true
    requestError.value = ""
    const response = isEditMode.value
      ? await updateOutlay(outlayId.value, payload)
      : await createOutlay(payload)

    if (response?.status === true) {
      await router.push("/dashboard")
      return
    }
    requestError.value = response?.message ?? "Не удалось сохранить смету."
  } catch (error) {
    console.error("Ошибка при сохранении сметы", error)
    requestError.value =
      error?.response?.data?.message ?? "Не удалось сохранить смету."
    const errors = error?.response?.data?.errors
    if (errors && typeof errors === "object") {
      invalidFields.value = new Set(Object.keys(errors).map((field) => field.split(".")[0]))
      requestError.value = Object.values(errors).flat().join(" ") || requestError.value
    }
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  try {
    isLoading.value = true
    await loadReferences()
    await loadOutlay()
  } catch (error) {
    console.error("Ошибка загрузки формы сметы", error)
    requestError.value = "Не удалось загрузить данные формы."
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="outlay-form-page">
    <header class="outlay-form-header">
      <div>
        <h1>{{ isEditMode ? `Редактирование сметы${formState.title.trim() ? ` «${formState.title.trim()}»` : ''}` : "Создание сметы" }}</h1>
        <p>Основные параметры заказа</p>
        <p v-if="!isEditMode && route.query.copy_from" class="text-sm">Копия сметы №{{ route.query.copy_from }}. Создастся только после сохранения; оплаты не переносятся.</p>
      </div>
      <MaterialButton color="secondary" variant="outline" @click="router.push('/dashboard')">
        К списку
      </MaterialButton>
    </header>

    <div v-if="requestError" class="alert alert-danger">{{ requestError }}</div>
    <p v-if="subdivisionMismatch" class="text-danger">В форме выбрано другое подразделение. Вернитесь к подразделению сметы перед сохранением.</p>
    <div v-if="invalidFields.has('subdivision_id')" class="alert alert-warning">
      Сначала выберите подразделение в шапке.
    </div>
    <div v-if="isLoading" class="text-center py-5"><span class="spinner-border text-success"></span></div>

    <form v-else class="outlay-form" novalidate @submit.prevent="handleSubmit">
      <p class="text-sm mb-0">Поля со звёздочкой (*) обязательны.</p>
      <div v-if="invalidFields.size" class="alert alert-danger" role="alert">
        Заполните или проверьте поля: {{ validationMessage }}.
      </div>
      <div class="form-section">
        <h2>Заказ</h2>
        <div class="row g-3">
          <div class="col-md-6"><MaterialInput id="outlay-date" v-model:value="formState.execution_date" label="Дата и время заказа *" type="datetime-local" isRequired :error="invalidFields.has('execution_date')" /></div>
          <div class="col-md-6"><MaterialInput id="outlay-date-comment" v-model:value="formState.date_comment" label="Примечание ко времени" /></div>
          <div class="col-md-6"><MaterialInput id="outlay-title" v-model:value="formState.title" label="Название *" isRequired :error="invalidFields.has('title')" /></div>
          <div class="col-md-6"><MaterialInput id="outlay-address" v-model:value="formState.address" label="Адрес" /></div>
          <div class="col-md-4"><MaterialInput id="outlay-return-date" v-model:value="formState.return_date" :label="'Дата и время возврата' + (selectedStatus?.affectsStock && hasRentalProducts ? ' *' : '')" type="datetime-local" :error="invalidFields.has('return_date')" /></div>
          <div class="col-md-8"><MaterialInput id="outlay-return-comment" v-model:value="formState.return_date_comment" label="Примечание ко времени возврата" /></div>
          <div class="col-md-6"><MaterialCheckbox id="outlay-self-pickup" v-model="formState.self_pickup">Самовывоз</MaterialCheckbox></div>
          <div class="col-md-6"><MaterialCheckbox id="outlay-self-return" v-model="formState.self_return">Самовозврат</MaterialCheckbox></div>
          <div class="col-md-4"><MaterialInput id="outlay-percent-discount" v-model:value="formState.percent_discount" label="Скидка, %" type="number" step="0.01" @update:value="formState.discount_amount = ''" /></div>
          <div class="col-md-4"><MaterialInput id="outlay-discount-amount" v-model:value="formState.discount_amount" label="Сумма скидки" type="number" step="0.01" /></div>
        </div>
      </div>

      <div class="form-section">
        <h2>Контрагент</h2>
        <div class="row g-3">
          <div class="col-md-6">
            <Multiselect v-model="formState.partner_entity" placeholder="Контрагент *" :options="partnerEntityOptions" :searchable="false" value-prop="value" label="label" track-by="label" :class="{ 'is-invalid': invalidFields.has('partner_entity') }" @change="handlePartnerEntityChange" />
          </div>
          <div class="col-md-6">
            <Multiselect
              v-model="formState.client_id"
              placeholder="Клиент *"
              :options="searchClients"
              :searchable="true"
              :min-chars="3"
              :delay="300"
              :filter-results="false"
              :resolve-on-load="false"
              :allow-absent="true"
              value-prop="value"
              label="label"
              track-by="label"
              :object="true"
              :disabled="!formState.partner_entity"
              :class="{ 'is-invalid': invalidFields.has('client_id') }"
              no-options-text="Введите минимум 3 символа"
              no-results-text="Ничего не найдено"
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h2>Ответственные</h2>
        <Multiselect v-model="formState.creator_id" placeholder="Создатель *" :options="userOptions" :searchable="true" value-prop="value" label="label" track-by="label" :class="{ 'is-invalid': invalidFields.has('creator_id') }" />
        <p v-if="invalidFields.has('creator_id')" class="text-danger text-sm mt-1 mb-0">Выберите создателя сметы.</p>
        <Multiselect v-model="formState.responsible_workers" class="mt-3" mode="tags" placeholder="Ответственные сотрудники" :options="userOptions" :searchable="true" :close-on-select="false" value-prop="value" label="label" track-by="label" />
        <Multiselect v-model="formState.status_id" class="mt-3" placeholder="Статус сметы *" :options="statusOptions" value-prop="value" label="label" :class="{ 'is-invalid': invalidFields.has('status_id') }" />
      </div>

      <div class="form-section">
        <OutlayComposition :key="formSubdivisionId" v-model="groups" :subdivision-id="formSubdivisionId" :disabled="isSaving || subdivisionMismatch"
          :availability-items="productAvailability" :availability-loading="availabilityLoading" :availability-error="availabilityError"
          @refresh-availability="refreshAvailability" />
        <p v-if="compositionMessage" class="text-danger mt-3" role="alert">{{ compositionMessage }}</p>
        <div class="text-end mt-3">
          <div>Без скидки: {{ formatMoney(totals.subtotal) }}</div>
          <div>Скидка: {{ formatMoney(totals.discount) }}</div>
          <strong>Итого: {{ formatMoney(totals.total) }}</strong>
        </div>
      </div>

      <div class="form-section">
        <h2>Оплата</h2>
        <p v-if="!cashBoxOptions.length" class="text-muted text-sm">
          Кассы не найдены. Добавьте кассу в разделе «Кассы».
        </p>
        <MaterialCheckbox id="outlay-prepayment" v-model="formState.prepayment" name="prepayment">
          Внесена предоплата
        </MaterialCheckbox>

        <div v-if="formState.prepayment" class="row g-3 mt-1 mb-4">
          <div class="col-md-4"><MaterialInput id="outlay-prepayment-amount" v-model:value="formState.prepayment_amount" label="Размер предоплаты *" type="number" step="0.01" :error="invalidFields.has('prepayment_amount')" /></div>
          <div class="col-md-4"><MaterialInput id="outlay-prepayment-date" v-model:value="formState.prepayment_date" label="Дата и время предоплаты *" type="datetime-local" :error="invalidFields.has('prepayment_date')" /></div>
          <div class="col-md-4"><Multiselect v-model="formState.prepayment_cash_box_id" placeholder="Касса предоплаты *" :options="cashBoxOptions" :searchable="true" value-prop="value" label="label" track-by="label" :class="{ 'is-invalid': invalidFields.has('prepayment_cash_box_id') }" /></div>
        </div>

        <MaterialCheckbox id="outlay-is-paid" v-model="formState.is_paid" name="is_paid">
          Оплачено полностью
        </MaterialCheckbox>

        <div v-if="formState.is_paid" class="row g-3 mt-1">
          <div class="col-md-6"><MaterialInput id="outlay-paid-date" v-model:value="formState.date_of_paid" label="Дата окончательной оплаты *" type="date" :error="invalidFields.has('date_of_paid')" /></div>
          <div class="col-md-6"><Multiselect v-model="formState.payment_cash_box_id" placeholder="Касса окончательной оплаты *" :options="cashBoxOptions" :searchable="true" value-prop="value" label="label" track-by="label" :class="{ 'is-invalid': invalidFields.has('payment_cash_box_id') }" /></div>
        </div>
      </div>

      <div class="outlay-form-actions">
        <MaterialButton type="button" color="secondary" variant="outline" @click="router.push('/dashboard')">Отмена</MaterialButton>
        <MaterialButton type="submit" color="success" :disabled="isSaving || subdivisionMismatch">
          {{ isSaving ? "Сохранение..." : "Сохранить" }}
        </MaterialButton>
      </div>
    </form>
    <OutlayAudit v-if="isEditMode && !isLoading" :key="outlayId" :outlay-id="outlayId" />
    <OutlayDocuments v-if="isEditMode && !isLoading" :outlay-id="outlayId" />
  </section>
</template>

<style scoped lang="scss">
.outlay-form-page { padding: 1.5rem; }
.outlay-form-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.outlay-form-header h1 { margin: 0; font-size: 1.75rem; font-weight: 600; }
.outlay-form-header p { margin: 0.25rem 0 0; color: #7b809a; }
.outlay-form { display: flex; flex-direction: column; gap: 1rem; }
.form-section { padding: 1.25rem; border: 1px solid rgba(127, 127, 127, 0.25); border-radius: 0.75rem; background: transparent; }
.form-section h2 { margin: 0 0 1rem; font-size: 1rem; font-weight: 700; }
.outlay-form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
@media (max-width: 575.98px) { .outlay-form-header { align-items: flex-start; flex-direction: column; } }
</style>
