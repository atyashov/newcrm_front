export const itemStageFields = [
  { key: 'assembled', label: 'Собран' },
  { key: 'uploaded', label: 'Погружен' },
  { key: 'retrieved', label: 'Забран' },
  { key: 'checked', label: 'Проверен' },
  { key: 'lost', label: 'Утеря' },
  { key: 'defective', label: 'Дефект' },
]
export const stageChecked = value => value === true || value === 1 || value === '1'
