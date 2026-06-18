import { apiPatch } from "@/api"

export const updateMenuPerms = async (menuId, permissions) => {
  const response = await apiPatch(`admin/menus/${menuId}`, { permissions })
  return response.data?.items ?? {}
}
