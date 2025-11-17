import { apiGet } from "@/api"

const extractItems = (response) => {
  if (!response || typeof response !== "object") {
    return []
  }

  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response.items)) {
    return response.items
  }

  if (response.data) {
    if (Array.isArray(response.data)) {
      return response.data
    }

    if (Array.isArray(response.data.items)) {
      return response.data.items
    }
  }

  return []
}

export const fetchClientTypes = async () => {
  const response = await apiGet("admin/client-types")
  return extractItems(response).map((item) => ({
    ...item,
    label: item?.name ?? item?.title ?? item?.label ?? "",
  }))
}
