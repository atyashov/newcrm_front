import { ref } from "vue"

/**
 * Composable для управления фильтрацией списков
 * @returns {Object} Объект с состоянием и методами фильтрации
 */
export const useFiltering = () => {
  const filterState = ref({})

  /**
   * Обновление состояния фильтров
   * @param {Object} filters - Объект с парами ключ-значение фильтров
   */
  const updateFilters = (filters) => {
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "") {
        filterState.value[key] = value
      } else {
        delete filterState.value[key]
      }
    })
  }

  /**
   * Получение параметров фильтров для API запроса
   * Возвращает только непустые значения
   * @returns {Object} Объект с параметрами фильтров
   */
  const getFilterParams = () => {
    const params = {}
    Object.entries(filterState.value).forEach(([key, value]) => {
      if (value && value !== "") {
        params[key] = value
      }
    })
    return params
  }

  /**
   * Очистка всех фильтров
   */
  const clearFilters = () => {
    filterState.value = {}
  }

  /**
   * Установка конкретного фильтра
   * @param {string} key - Ключ фильтра
   * @param {any} value - Значение фильтра
   */
  const setFilter = (key, value) => {
    if (value && value !== "") {
      filterState.value[key] = value
    } else {
      delete filterState.value[key]
    }
  }

  /**
   * Получение значения конкретного фильтра
   * @param {string} key - Ключ фильтра
   * @returns {any} Значение фильтра или undefined
   */
  const getFilter = (key) => {
    return filterState.value[key]
  }

  return {
    filterState,
    updateFilters,
    getFilterParams,
    clearFilters,
    setFilter,
    getFilter,
  }
}
