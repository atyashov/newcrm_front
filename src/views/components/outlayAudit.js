export const auditEvents = [
  { value: 'created', label: 'Создание сметы' },
  { value: 'form_updated', label: 'Редактирование сметы' },
  { value: 'creator_changed', label: 'Изменение создателя' },
  { value: 'status_changed', label: 'Изменение статуса' },
]
export const auditUser = entry => entry?.source === 'system' ? 'Система'
  : entry?.user?.login || [entry?.user?.firstname, entry?.user?.lastname].filter(Boolean).join(' ') || 'Пользователь неизвестен'
const userName = user => user?.login || [user?.firstname, user?.lastname].filter(Boolean).join(' ') || (user?.id ? `ID ${user.id}` : 'Не указан')
const statusName = status => status?.title || (status?.id ? `ID ${status.id}` : 'Не указан')
export const auditDescription = entry => {
  if (entry.event === 'status_changed') return entry.from_status
    ? `${statusName(entry.from_status)} → ${statusName(entry.to_status)}` : `Установлен: ${statusName(entry.to_status)}`
  if (entry.event === 'creator_changed') return `${userName(entry.from_creator)} → ${userName(entry.to_creator)}`
  return auditEvents.find(event => event.value === entry.event)?.label || entry.event
}
