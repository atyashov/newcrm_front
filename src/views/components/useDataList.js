import { ref } from "vue"

/**
 * Composable для управления списком данных с обработкой загрузки и ошибок
 * @param {Function} fetchFunction - Функция для загрузки данных (должна возвращать { data, pagination })
 * @returns {Object} Объект с состоянием и методами для работы со списком
 */
export const useDataList = (fetchFunction) => {
  const items = ref([])
  const isLoading = ref(false)
  const requestError = ref("")
  const requestSuccess = ref("")

  /**
   * Загрузка данных с обработкой ошибок
   * @param {Object} params - Параметры для запроса
   * @param {Function} onSuccess - Callback при успешной загрузке
   * @param {Function} onError - Callback при ошибке
   * @returns {Promise<Object>} Результат загрузки { data, pagination }
   */
  const loadData = async (params = {}, onSuccess = null, onError = null) => {
    try {
      isLoading.value = true
      requestError.value = ""

      const result = await fetchFunction(params)

      const data = Array.isArray(result?.data) ? result.data : []
      items.value = data

      if (onSuccess) {
        onSuccess(result)
      }

      return result
    } catch (error) {
      console.error("Ошибка при загрузке данных", error)
      const errorMessage =
        error?.response?.data?.message ??
        "Не удалось загрузить данные. Попробуйте позже."
      requestError.value = errorMessage

      if (onError) {
        onError(error)
      }

      return {
        data: [],
        pagination: null,
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Показ сообщения об успехе
   * @param {string} message - Текст сообщения
   * @param {number} duration - Длительность показа в миллисекундах (по умолчанию 3000)
   */
  const showSuccess = (message, duration = 3000) => {
    requestSuccess.value = message
    if (duration > 0) {
      setTimeout(() => {
        requestSuccess.value = ""
      }, duration)
    }
  }

  /**
   * Показ сообщения об ошибке
   * @param {string} message - Текст сообщения
   */
  const showError = (message) => {
    requestError.value = message
  }

  /**
   * Очистка сообщений
   */
  const clearMessages = () => {
    requestError.value = ""
    requestSuccess.value = ""
  }

  /**
   * Очистка списка данных
   */
  const clearItems = () => {
    items.value = []
  }

  return {
    items,
    isLoading,
    requestError,
    requestSuccess,
    loadData,
    showSuccess,
    showError,
    clearMessages,
    clearItems,
  }
}
