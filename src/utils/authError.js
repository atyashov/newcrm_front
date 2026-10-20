const messages = (value) => {
  if (typeof value === "string") return value.trim() ? [value] : []
  if (Array.isArray(value)) return value.flatMap(messages)
  if (value && typeof value === "object") return Object.values(value).flatMap(messages)
  return []
}

export const authErrorMessage = (response) => {
  const errors = messages(response?.errors)
  if (errors.length) return [...new Set(errors)].join("\n")
  return messages(response?.message ?? response?.error).join("\n") ||
    "Не удалось войти. Проверьте логин и пароль и попробуйте снова."
}
