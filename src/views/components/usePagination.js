import { computed, ref } from "vue"

/**
 * Composable для управления пагинацией списков
 * @param {number} initialPageSize - Начальный размер страницы (по умолчанию 20)
 * @returns {Object} Объект с состоянием и методами пагинации
 */
export const usePagination = (initialPageSize = 20) => {
  const pageSize = ref(initialPageSize)

  const paginationMeta = ref({
    current_page: 1,
    last_page: 1,
    per_page: initialPageSize,
    total: 0,
    prev_page_url: null,
    next_page_url: null,
    links: [],
  })

  /**
   * Computed для получения текущей страницы
   */
  const currentPage = computed(() => {
    const raw = paginationMeta.value?.current_page
    const numeric = Number(raw)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1
  })

  /**
   * Computed для получения общего количества страниц
   */
  const totalPages = computed(() => {
    const meta = paginationMeta.value ?? {}

    if (meta.last_page !== undefined) {
      const numeric = Number(meta.last_page)
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric
      }
    }

    if (meta.total !== undefined && meta.per_page) {
      const total = Number(meta.total)
      const perPage = Number(meta.per_page)
      if (Number.isFinite(total) && Number.isFinite(perPage) && perPage > 0) {
        return Math.max(1, Math.ceil(total / perPage))
      }
    }

    if (Array.isArray(meta.links) && meta.links.length) {
      const numericLinks = meta.links.filter((link) =>
        /^\d+$/.test(String(link.label))
      )
      if (numericLinks.length) {
        return numericLinks.length
      }
    }

    return 1
  })

  /**
   * Обновление метаданных пагинации
   * @param {Object} pagination - Объект с метаданными пагинации
   * @param {number} fallbackPage - Страница по умолчанию, если не указана в pagination
   * @param {number} fallbackPerPage - Размер страницы по умолчанию
   */
  const updatePaginationMeta = (
    pagination,
    fallbackPage = 1,
    fallbackPerPage = pageSize.value
  ) => {
    paginationMeta.value = {
      current_page:
        Number(pagination?.current_page ?? fallbackPage) > 0
          ? Number(pagination?.current_page ?? fallbackPage)
          : fallbackPage,
      last_page: Number(pagination?.last_page ?? pagination?.total_pages) || 1,
      per_page: Number(pagination?.per_page ?? fallbackPerPage) || fallbackPerPage,
      total: Number(pagination?.total ?? 0) || 0,
      prev_page_url: pagination?.prev_page_url ?? null,
      next_page_url: pagination?.next_page_url ?? null,
      links: Array.isArray(pagination?.links) ? pagination.links : [],
    }
  }

  /**
   * Проверка, можно ли перейти на указанную страницу
   * @param {number} page - Номер страницы
   * @param {boolean} isLoading - Флаг загрузки
   * @returns {boolean} true, если можно перейти
   */
  const canGoToPage = (page, isLoading = false) => {
    return (
      page >= 1 &&
      page <= totalPages.value &&
      page !== currentPage.value &&
      !isLoading
    )
  }

  /**
   * Изменение размера страницы
   * @param {number} newSize - Новый размер страницы
   * @returns {number} Валидированный размер страницы или null, если невалидный
   */
  const changePageSize = (newSize) => {
    const nextSize = Number(newSize)

    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return null
    }

    pageSize.value = nextSize
    return nextSize
  }

  /**
   * Сброс пагинации на первую страницу
   */
  const resetToFirstPage = () => {
    paginationMeta.value.current_page = 1
  }

  return {
    pageSize,
    paginationMeta,
    currentPage,
    totalPages,
    updatePaginationMeta,
    canGoToPage,
    changePageSize,
    resetToFirstPage,
  }
}
