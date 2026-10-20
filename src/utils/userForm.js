export const userFields = [
  { key: "firstname", label: "Имя", required: true },
  { key: "lastname", label: "Фамилия", required: true },
  { key: "login", label: "Логин", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Телефон", required: true },
]
export const userPayload = (form, editing, includeSubdivisions = true) => {
  const payload = Object.fromEntries(userFields.map(({ key }) => [key, String(form[key] ?? "").trim()]))
  payload.status = String(form.status)
  payload.role_id = Number(form.role_id)
  if (includeSubdivisions) payload.subdivision_ids = [...new Set(form.subdivision_ids.map(Number))]
  if (form.password) {
    payload.password = form.password
    payload.password_confirmation = form.password_confirmation
  }
  return payload
}
export const invalidUserFields = (form, editing) => {
  const invalid = new Set(userFields.filter(({ key, required }) => required && !String(form[key] ?? "").trim()).map(({ key }) => key))
  if (!form.role_id) invalid.add("role_id")
  if (!["0", "1"].includes(String(form.status))) invalid.add("status")
  if (String(form.login).length > 90) invalid.add("login")
  if (!editing && !form.password) invalid.add("password")
  if (form.password) {
    if (!form.password_confirmation || form.password !== form.password_confirmation) invalid.add("password_confirmation")
  }
  return invalid
}
