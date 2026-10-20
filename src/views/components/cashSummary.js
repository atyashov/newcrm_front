export const currentMonthRange = (date = new Date()) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  return {
    date_start_from: `${prefix}-01`,
    date_start_to: `${prefix}-${new Date(year, month + 1, 0).getDate()}`,
  }
}

export const cashSummaryMetrics = [
  { value: "opening_balance", label: "Остаток на начало" },
  { value: "outlay_income", label: "Поступления по сметам" },
  { value: "expenses", label: "Расходы" },
  { value: "borrowing_received", label: "Полученные займы" },
  { value: "borrowing_sent", label: "Выданные займы" },
  { value: "closing_balance", label: "Остаток на конец" },
]
