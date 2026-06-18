import { computed, ref } from "vue"

/**
 * Composable для управления сортировкой списков
 * @returns {Object} Объект с состоянием и методами сортировки
 */
export const useSorting = () => {
  const sortState = ref({})

  /**
   * Переключение сортировки для поля
   * Цикл: null -> asc -> desc -> null
   * @param {string} field - Название поля для сортировки
   */
  const toggleSort = (field) => {
    const currentSort = sortState.value[field]

    // Сбрасываем сортировку для других полей
    Object.keys(sortState.value).forEach((key) => {
      if (key !== field) {
        sortState.value[key] = null
      }
    })

    // Циклическое переключение: null -> asc -> desc -> null
    if (!currentSort || currentSort === null) {
      sortState.value[field] = "asc"
    } else if (currentSort === "asc") {
      sortState.value[field] = "desc"
    } else if (currentSort === "desc") {
      sortState.value[field] = null
    }
  }

  /**
   * Получение иконки сортировки для поля
   * @param {string} field - Название поля
   * @returns {string|null} Название иконки Material Icons или null
   */
  const getSortIcon = (field) => {
    const sort = sortState.value[field]
    if (sort === "asc") return "arrow_upward"
    if (sort === "desc") return "arrow_downward"
    return null
  }

  /**
   * Получение параметра сортировки для API запроса
   * @returns {string|null} Параметр sort в формате "field" или "-field" или null
   */
  const getSortParam = () => {
    const activeSortField = Object.keys(sortState.value).find(
      (key) => sortState.value[key] !== null
    )

    if (!activeSortField) {
      return null
    }

    const sortDirection = sortState.value[activeSortField]
    return sortDirection === "desc" ? `-${activeSortField}` : activeSortField
  }

  /**
   * Computed для получения иконок сортировки всех полей
   */
  const sortIcons = computed(() => {
    const icons = {}
    Object.keys(sortState.value).forEach((field) => {
      const sort = sortState.value[field]
      if (sort === "asc") {
        icons[field] = "arrow_upward"
      } else if (sort === "desc") {
        icons[field] = "arrow_downward"
      } else {
        icons[field] = null
      }
    })
    return icons
  })

  /**
   * Сброс сортировки для всех полей
   */
  const resetSort = () => {
    Object.keys(sortState.value).forEach((key) => {
      sortState.value[key] = null
    })
  }

  return {
    sortState,
    toggleSort,
    getSortIcon,
    getSortParam,
    sortIcons,
    resetSort,
  }
}
