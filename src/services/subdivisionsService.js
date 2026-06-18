import { apiGet, ApiPost, ApiPut, ApiDelete } from "@/api"

export const fetchSubdivisions = async (params = {}) => {
  const response = await apiGet("admin/subdivisions", params)
  if (response?.status !== true) {
    return {
      data: [],
    }
  }

  return {
    data: response.data?.items ?? [],
  }
}
