/* global BigInt */

let sequence = 0
export const validQuantity = value => /^\d+(?:\.0{1,3})?$/.test(String(value)) && Number(value) >= 1 && Number(value) <= 99999
export const quantityForRequest = value => {
  if (!validQuantity(value)) throw new Error("Количество должно быть целым числом от 1 до 99999.")
  return String(Number(value))
}
export const copyOutlayForCreate = (item, creatorId) => ({
  ...item, id: null, public_uuid: undefined, creator_id: creatorId,
  is_paid: false, date_of_paid: null, payment_cash_box_id: null, payment_cash_box: null,
  prepayment: false, prepayment_amount: null, prepayment_date: null, prepayment_cash_box_id: null, prepayment_cash_box: null,
  responsible_workers: [],
  groups: (item.groups || []).map(group => ({ ...group, id: null,
    items: (group.items || []).map(position => ({ ...position, id: null, stages: undefined })),
  })),
})
const key = () => `outlay-row-${++sequence}`

export const newGroup = () => ({ key: key(), id: null, name: null, items: [] })
export const productOption = (product) => ({
  value: product.id,
  label: product.title || `Товар №${product.id}`,
  price: product.price,
  quantity: product.quantity,
  unlimited: product.unlimited === true || Number(product.unlimited) === 1,
  isRent: product.is_rent === true || Number(product.is_rent) === 1,
})
export const newItem = (product) => ({
  key: key(), id: null, product,
  price: String(product.price ?? ""), quantity: "1",
})

export const normalizeGroups = (groups = []) => groups.map((group) => ({
  key: key(), id: group.id,
  name: { value: group.outlay_group_name_id, label: group.group_name?.name || `Группа №${group.outlay_group_name_id}` },
  items: (group.items ?? []).map((item) => ({
    key: key(), id: item.id,
    product: {
      value: item.product_id,
      label: item.product_title_snapshot || `Товар №${item.product_id}`,
      isRent: item.is_rent === true || Number(item.is_rent) === 1,
    },
    price: String(item.price), quantity: validQuantity(item.quantity) ? String(Number(item.quantity)) : String(item.quantity),
    description: item.description,
    images: item.images?.map((image) => image.path),
  })),
}))

export const serializeGroups = (groups) => groups.map((group) => ({
  ...(group.id ? { id: group.id } : {}),
  outlay_group_name_id: Number(group.name?.value),
  items: group.items.map((item) => ({
    ...(item.id ? { id: item.id } : {}),
    product_id: Number(item.product.value),
    price: String(item.price), quantity: quantityForRequest(item.quantity),
    ...(item.description !== undefined ? { description: item.description } : {}),
    ...(item.images !== undefined ? { images: item.images } : {}),
  })),
}))

export const validDecimal = (value, digits, min, max) =>
  new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`).test(String(value)) &&
  Number(value) >= min && Number(value) <= max

// Integer arithmetic matches the server's per-line rounding.
const scaled = (value, digits) => {
  const [whole, fraction = ""] = String(value).split(".")
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) return 0n
  return BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0").slice(0, digits) || "0")
}
export const lineCents = (item) => (scaled(item.price, 2) * scaled(item.quantity, 3) + 500n) / 1000n
export const subtotalCents = (groups) => groups.reduce((sum, group) =>
  sum + group.items.reduce((total, item) => total + lineCents(item), 0n), 0n)
export const discountedCents = (groups, percent, amount) => {
  const subtotal = subtotalCents(groups)
  const discount = amount !== "" && amount !== null && amount !== undefined
    ? scaled(amount, 2) : (subtotal * scaled(percent || 0, 2) + 5000n) / 10000n
  return { subtotal, discount, total: subtotal - discount }
}
export const formatMoney = (cents) => new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(cents) / 100)

export const compositionError = (groups) => {
  if (groups.length > 100) return "Можно добавить не более 100 групп."
  for (const [g, group] of groups.entries()) {
    if (!group.name?.value) return `Выберите название группы ${g + 1}.`
    if (group.items.length > 1000) return `В группе ${g + 1} слишком много товаров.`
    for (const [i, item] of group.items.entries()) {
      if (!item.product?.value || !validDecimal(item.price, 2, 0, 9999999.99) ||
        !validQuantity(item.quantity)) {
        return `Группа ${g + 1}, товар ${i + 1}: цена — до 2 знаков после точки, количество — целое число от 1 до 99999.`
      }
    }
  }
  if (subtotalCents(groups) > 999999999999n) return "Сумма сметы превышает допустимый предел."
  return ""
}
