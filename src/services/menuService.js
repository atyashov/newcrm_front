import { apiGet } from "../api"

export const fetchMenus = async () => {
  const response = await apiGet("admin/menus")

  if (response.status !== true) {
    console.error("Не удалось получить меню, ", response.error)
    return []
  }

  return response.data?.items ?? {}
}

export const fetchManageMenu = async () => {
  const response = await apiGet("admin/menus/manage")

  if (response.status !== true) {
    console.error("Не удалось получить меню, ", response.error)
    return []
  }

  return response.data?.items ?? {}
}
