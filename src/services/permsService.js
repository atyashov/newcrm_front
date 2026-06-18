import { apiGet } from "@/api"

export const fetchPerms = async () => {
  const response = await apiGet("admin/permissions")

  if (response?.status !== true) {
    return {
      data: [],
    }
  }

  const items = response.data?.items ?? []

  return {
    data: Array.isArray(items) ? items : items.data ?? [],
  }
}
