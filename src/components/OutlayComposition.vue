<script setup>
import { computed, ref } from "vue"
import Multiselect from "@vueform/multiselect"
import MaterialButton from "@/components/MaterialButton.vue"
import MaterialInput from "@/components/MaterialInput.vue"
import { fetchProducts } from "@/services/productsService"
import { fetchOutlayGroupNames } from "@/services/outlayGroupNamesService"
import { newGroup, newItem, productOption, lineCents, formatMoney, validQuantity } from "@/views/components/outlayComposition"

const props = defineProps({
  modelValue: { type: Array, required: true },
  subdivisionId: { type: [Number, String], default: null },
  disabled: Boolean,
  availabilityItems: { type: Object, default: () => ({}) },
  availabilityLoading: Boolean,
  availabilityError: { type: String, default: "" },
})
const emit = defineEmits(["update:modelValue", "refresh-availability"])
const searchError = ref("")
const searches = new Map()
const update = (groups) => emit("update:modelValue", groups)
const addGroup = () => update([...props.modelValue, newGroup()])
const removeGroup = (group) => {
  if (!group.items.length || confirm("Удалить группу вместе с её товарами?")) {
    update(props.modelValue.filter((entry) => entry.key !== group.key))
  }
}
const patchGroup = (group, patch) => update(props.modelValue.map((entry) =>
  entry.key === group.key ? { ...entry, ...patch } : entry))
const patchItem = (group, item, patch) => patchGroup(group, {
  items: group.items.map((entry) => entry.key === item.key ? { ...entry, ...patch } : entry),
})
const addProduct = (group, product, select) => {
  if (!product || props.disabled) return
  patchGroup(group, { items: [...group.items, newItem(product)] })
  select.clear()
  select.clearSearch()
}
const searchNames = async (query) => {
  if (!props.subdivisionId) return []
  try {
    searchError.value = ""
    const response = await fetchOutlayGroupNames({
      subdivision_id: props.subdivisionId, page_size: 100, name: query?.trim() || undefined,
    })
    return response.data.map((group) => ({ value: group.id, label: group.name }))
  } catch (err) {
    searchError.value = "Не удалось загрузить названия групп. Повторите поиск."
    return []
  }
}
// Each group owns its search function so rerenders do not restart remote searches.
const productSearch = (group) => {
  if (!searches.has(group.key)) searches.set(group.key, async (query) => {
    if (!props.subdivisionId || (query?.trim().length ?? 0) < 3) return []
    try {
      searchError.value = ""
      const result = await fetchProducts({ subdivision_id: props.subdivisionId, title: query.trim(), page: 1, pageSize: 50 })
      return result.data.map(productOption)
    } catch (err) {
      searchError.value = "Не удалось загрузить товары. Повторите поиск."
      return []
    }
  })
  return searches.get(group.key)
}
const selectedQuantities = computed(() => {
  const quantities = {}
  props.modelValue.forEach((group) => group.items.forEach((item) => {
    const id = item.product.value
    quantities[id] = (quantities[id] ?? 0) + Math.round((Number(item.quantity) || 0) * 1000)
  }))
  return quantities
})
const availability = (item) => {
  if (props.availabilityLoading) return "Обновление остатков..."
  const stock = props.availabilityItems[item.product.value]
  if (!stock) return "Остаток не получен"
  if (stock.available_quantity === null) return "Количество не ограничено"
  const selected = (selectedQuantities.value[item.product.value] ?? 0) / 1000
  const remaining = Math.round((Number(stock.available_quantity) - selected) * 1000) / 1000
  return `Всего: ${Number(stock.total_quantity)}; занято другими: ${Number(stock.occupied_quantity)}; доступно: ${Number(stock.available_quantity)}; в смете: ${selected}. ${remaining < 0 ? `Не хватает: ${-remaining}` : `Останется: ${remaining}`}`
}
</script>

<template>
  <section class="composition">
    <header class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
      <h2 class="mb-0">Товары в смете</h2>
      <MaterialButton type="button" color="success" :disabled="disabled || !subdivisionId || modelValue.length >= 100" @click="addGroup">Добавить группу</MaterialButton>
    </header>
    <p class="text-sm">Остатки учитывают бронирования на выбранные даты без этой сметы. При сохранении сервер проверит их повторно.</p>
    <div v-if="availabilityError" class="text-warning mb-3" role="alert">
      <p class="mb-2">{{ availabilityError }}</p>
      <MaterialButton type="button" color="secondary" variant="outline" size="sm" :disabled="disabled || availabilityLoading" @click="emit('refresh-availability')">Обновить остатки</MaterialButton>
    </div>
    <p v-if="searchError" class="text-danger" role="alert">{{ searchError }}</p>
    <p v-if="!modelValue.length" class="text-sm">Добавьте группу и выберите товары поиском по названию.</p>
    <article v-for="(group, index) in modelValue" :key="group.key" class="composition-group">
      <div class="group-heading">
        <strong>{{ index + 1 }}.</strong>
        <Multiselect :model-value="group.name" :options="searchNames" :object="true" :searchable="true"
          :delay="300" :min-chars="0" :filter-results="false" :resolve-on-load="true"
          value-prop="value" label="label" track-by="label" placeholder="Название группы"
          :disabled="disabled" no-results-text="Группы не найдены" @change="patchGroup(group, { name: $event })" />
        <MaterialButton type="button" color="danger" variant="outline" size="sm" :disabled="disabled" title="Удалить группу" @click="removeGroup(group)">Удалить группу</MaterialButton>
      </div>
      <div v-for="item in group.items" :key="item.key" class="product-row">
        <div class="product-title">{{ item.product.label }}</div>
        <MaterialInput :id="`${item.key}-price`" :value="item.price" label="Цена" type="number" step="0.01"
          :disabled="disabled" @update:value="patchItem(group, item, { price: $event })" />
        <div>
          <MaterialInput :id="`${item.key}-quantity`" :value="item.quantity" label="Количество" type="number" step="1" :error="!validQuantity(item.quantity)"
            :disabled="disabled" @update:value="patchItem(group, item, { quantity: $event })" />
          <small class="stock">{{ availability(item) }}</small>
          <p v-if="!validQuantity(item.quantity)" class="text-danger text-sm mb-0">Введите целое количество от 1 до 99999. Дробное значение не будет округлено автоматически.</p>
        </div>
        <div><small>Сумма без скидки</small><strong class="d-block">{{ formatMoney(lineCents(item)) }}</strong></div>
        <MaterialButton type="button" color="danger" variant="outline" size="sm" title="Удалить товар" :disabled="disabled"
          @click="patchGroup(group, { items: group.items.filter((row) => row.key !== item.key) })"><i class="material-icons">delete</i></MaterialButton>
      </div>
      <Multiselect :options="productSearch(group)" :object="true" :searchable="true" :min-chars="3" :delay="300"
        :filter-results="false" :resolve-on-load="false" value-prop="value" label="label" track-by="label"
        placeholder="Добавить товар: введите название" no-options-text="Введите минимум 3 символа" no-results-text="Товары не найдены"
        :disabled="disabled || !group.name || group.items.length >= 1000" @select="(value, option, select) => addProduct(group, option, select)" />
      <p class="text-end mt-3 mb-0">Итого по группе без скидки: <strong>{{ formatMoney(group.items.reduce((sum, item) => sum + lineCents(item), 0n)) }}</strong></p>
    </article>
  </section>
</template>

<style scoped lang="scss">
.composition h2 { font-size: 1rem; font-weight: 700; }
.composition-group { padding: 1rem; margin-top: 1rem; border: 1px solid rgba(127,127,127,.25); border-radius: .75rem; }
.group-heading { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.group-heading .multiselect { flex: 1; min-width: 0; }
.product-row { display: grid; grid-template-columns: minmax(160px,2fr) minmax(100px,1fr) minmax(160px,1.5fr) minmax(100px,1fr) auto; align-items: start; gap: 1rem; margin-bottom: 1.5rem; }
.product-title { overflow-wrap: anywhere; }
.stock { display: block; margin-top: .4rem; }
.product-row .material-icons { font-size: 1.4rem; }
@media(max-width: 991px) { .product-row { grid-template-columns: 1fr 1fr; } .product-title { grid-column: 1 / -1; } .group-heading { flex-wrap: wrap; } }
@media(max-width: 575px) { .product-row { grid-template-columns: 1fr; } }
</style>
