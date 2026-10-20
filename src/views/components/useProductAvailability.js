import { computed, onScopeDispose, ref, watch } from "vue"
import { fetchProductAvailability } from "@/services/productsService"

export const availabilityDate = (value) => {
  if (!value) return null
  const date = String(value).replace("T", " ")
  return date.length === 16 ? `${date}:00` : date
}

export const uniqueProductIds = (groups) => [...new Set(groups.flatMap((group) =>
  group.items.map((item) => Number(item.product.value))))]
  .filter((id) => Number.isInteger(id) && id > 0).sort((a, b) => a - b)

export const useProductAvailability = ({ groups, subdivisionId, outlayId, startsAt, endsAt, ready }) => {
  const items = ref({})
  const loading = ref(false)
  const error = ref("")
  let version = 0
  let timer
  const context = computed(() => JSON.stringify({
    ids: uniqueProductIds(groups.value),
    subdivision: subdivisionId.value,
    outlay: outlayId.value,
    start: availabilityDate(startsAt.value),
    end: availabilityDate(endsAt.value),
    ready: ready.value,
  }))

  const refresh = async () => {
    clearTimeout(timer)
    const currentVersion = ++version
    const request = JSON.parse(context.value)
    items.value = {}
    error.value = ""
    loading.value = false
    if (!request.ready || !request.ids.length) return
    if (!request.subdivision || !request.start) {
      error.value = "Для расчёта остатков выберите подразделение и дату заказа."
      return
    }
    if (request.end && request.end < request.start) {
      error.value = "Дата возврата не может быть раньше даты заказа."
      return
    }
    loading.value = true
    try {
      const result = {}
      // The endpoint accepts at most 1000 unique products per batch.
      for (let offset = 0; offset < request.ids.length; offset += 1000) {
        const response = await fetchProductAvailability({
          subdivision_id: Number(request.subdivision),
          product_ids: request.ids.slice(offset, offset + 1000),
          starts_at: request.start,
          ends_at: request.end,
          ...(request.outlay ? { outlay_id: Number(request.outlay) } : {}),
        })
        if (currentVersion !== version) return
        if (response?.status !== true || !Array.isArray(response.data?.items)) {
          throw Object.assign(new Error("Не удалось загрузить остатки."), { response: { data: response } })
        }
        response.data.items.forEach((item) => { result[item.product_id] = item })
      }
      if (request.ids.some((id) => !result[id])) throw new Error("В ответе отсутствуют остатки некоторых товаров.")
      items.value = result
    } catch (err) {
      if (currentVersion !== version) return
      const data = err.response?.data
      error.value = Object.values(data?.errors ?? {}).flat().join(" ") ||
        data?.message || err.message || "Не удалось загрузить остатки. Повторите запрос."
    } finally {
      if (currentVersion === version) loading.value = false
    }
  }

  watch(context, () => {
    ++version
    clearTimeout(timer)
    items.value = {}
    error.value = ""
    loading.value = false
    if (!ready.value || !uniqueProductIds(groups.value).length) return
    loading.value = true
    timer = setTimeout(refresh, 300)
  }, { immediate: true, flush: "sync" })

  onScopeDispose(() => {
    ++version
    clearTimeout(timer)
  })
  return { items, loading, error, refresh }
}
