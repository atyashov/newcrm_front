import axios from "axios"
import { showSuccess, showError } from "@/utils/notification"

export const API = process.env.VUE_APP_API_URL
export const TOKEN_USER_NAME = process.env.VUE_APP_STORAGE_NAME ?? "user-token"
export const token = localStorage.getItem(TOKEN_USER_NAME)

export const headers = {
  Authorization: `Bearer ${token}`,
}

const config = {
  headers: headers,
}

export const apiGet = async (url, params) => {
  let res = await axios.get(`${API}/${url}`, {
    params,
    headers: config.headers,
  })
  if (res.status === 401) {
    window.location = "/"
  }
  if (res.data.message) {
    console.log("message", res.data.message)
  }

  return res.data
}

const handleMutatingRequest = async (requestFn, url, data, options = {}) => {
  try {
    const requestConfig = {
      ...config,
      ...options,
      headers: {
        ...config.headers,
        ...(options.headers ?? {}),
      },
    }

    const requestArgs =
      data === undefined
        ? [`${API}/${url}`, requestConfig]
        : [`${API}/${url}`, data, requestConfig]

    const res = await requestFn(...requestArgs)
    const responseData = res.data

    // Проверяем, пометил ли сервер ответ как ошибку
    if (responseData.status === false || responseData.error) {
      const message =
        responseData.error || responseData.message || "Произошла ошибка"
      showError(message)
      return responseData
    }

    // Успешный ответ (HTTP 2xx и нет флага ошибки)
    const message = responseData.message || "Операция выполнена успешно"
    showSuccess(message)
    return responseData
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Сетевая ошибка"
    showError(errorMessage)
    throw error
  }
}

export const apiPost = async (url, data) => {
  return handleMutatingRequest(axios.post, url, data)
}

export const apiPatch = async (url, data) => {
  return handleMutatingRequest(axios.patch, url, data)
}

export const apiPut = async (url, data) => {
  return handleMutatingRequest(axios.put, url, data)
}

export const apiDelete = async (url, options = {}) => {
  return handleMutatingRequest(axios.delete, url, undefined, options)
}
