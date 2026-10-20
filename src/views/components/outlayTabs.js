export const assignmentGroups = [
  { field: "performer_ids", relation: "performers", label: "Исполнители заказа" },
  { field: "return_performer_ids", relation: "return_performers", label: "Исполнители возврата" },
  { field: "assembler_ids", relation: "assemblers", label: "Сборщики заказа" },
  { field: "acceptor_ids", relation: "acceptors", label: "Приёмщики заказа" },
]

export const operationTypes = [
  { value: "outlay_prepayment", label: "Предоплата" },
  { value: "outlay_payment", label: "Оплата" },
  { value: "expense", label: "Расход" },
  { value: "borrowing_sent", label: "Расход займа" },
  { value: "borrowing_received", label: "Приход займа" },
]
export const userLabel = (user) => [user.firstname, user.lastname].filter(Boolean).join(" ") || user.login || `ID ${user.id}`
export const staffLabel = (users) => users?.map(userLabel).join(", ") || "Не назначены"
export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
export const displayDateTime = (value) => {
  if (!value) return "—"
  const [date, time] = String(value).replace("T", " ").split(" ")
  return `${date.split("-").reverse().join(".")}${time ? ` ${time.slice(0, 5)}` : ""}`
}
export const displayMoney = (value) => new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)

export const tabParams = ({ kind, filters = {}, subdivisionId, from, to, selfService, page = 1, pageSize = 20, sort }) => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) =>
    value !== "" && value != null && (!Array.isArray(value) || value.length)))
  if (subdivisionId) params.subdivision_id = subdivisionId
  const keys = kind === "orders" ? ["date_start_from", "date_start_to"]
    : kind === "returns" ? ["return_date_from", "return_date_to"] : ["date_from", "date_to"]
  if (from) params[keys[0]] = from
  if (to) params[keys[1]] = to
  if (selfService && ["orders", "returns"].includes(kind)) params[kind === "orders" ? "self_pickup" : "self_return"] = true
  return { ...params, page, page_size: Math.min(100, Number(pageSize) || 20), sort: sort || (kind === "orders" ? "execution_date" : kind === "returns" ? "return_date" : "-occurred_at") }
}

export const scheduleText = (orders, returns) => {
  const events = [
    ...orders.map(item => ({ item, date: item.execution_date, returning: false })),
    ...returns.map(item => ({ item, date: item.return_date, returning: true })),
  ].filter(event => event.date).sort((a, b) => String(a.date).localeCompare(String(b.date)) || Number(a.item.id) - Number(b.item.id))
  let day = ""
  return events.map(({ item, date, returning }) => {
    const nextDay = String(date).slice(0, 10)
    const heading = nextDay !== day ? `${nextDay.split("-").reverse().join(".")}\n` : ""
    day = nextDay
    const comment = returning ? item.return_date_comment : item.date_comment
    return `${heading}${returning ? "(Возврат) " : ""}${String(date).slice(11, 16)} ${comment || ""} — №${item.id} ${item.title || ""} — ${item.address || "Адрес не указан"}`
  }).join("\n----------\n")
}
