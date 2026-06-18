/**
 * Утилита для формирования параметров запроса из фильтров, сортировки и пагинации
 * @param {Object} options - Объект с опциями
 * @param {number} options.page - Номер страницы
 * @param {number} options.perPage - Размер страницы
 * @param {Object} options.filters - Объект с фильтрами (опционально)
 * @param {string|null} options.sort - Параметр сортировки в формате "field" или "-field" (опционально)
 * @returns {Object} Объект с параметрами для API запроса
 */
export const buildQueryParams = ({
  page,
  perPage,
  filters = {},
  sort = null,
}) => {
  const params = {
    page: Number(page) || 1,
    page_size: Number(perPage) || 20,
  }

  // Добавляем фильтры (только непустые значения)
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      params[key] = value
    }
  })

  // Добавляем сортировку (если указана)
  if (sort) {
    params.sort = sort
  }

  return params
}
