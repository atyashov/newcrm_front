import { ref } from "vue"

/**
 * Composable для управления модальными окнами
 * @returns {Object} Объект с состоянием и методами для работы с модалкой
 */
export const useModal = () => {
  const isOpen = ref(false)
  const editingId = ref(null)
  const editingData = ref(null)

  /**
   * Открытие модального окна
   * @param {string|number|null} id - ID редактируемой записи (опционально)
   * @param {Object|null} data - Данные для редактирования (опционально)
   */
  const open = (id = null, data = null) => {
    editingId.value = id
    editingData.value = data ? { ...data } : null
    isOpen.value = true
  }

  /**
   * Закрытие модального окна
   */
  const close = () => {
    isOpen.value = false
    editingId.value = null
    editingData.value = null
  }

  /**
   * Проверка, открыта ли модалка в режиме редактирования
   * @returns {boolean} true, если модалка открыта для редактирования
   */
  const isEditMode = () => {
    return Boolean(isOpen.value && editingId.value)
  }

  /**
   * Сброс состояния модалки
   */
  const reset = () => {
    close()
  }

  return {
    isOpen,
    editingId,
    editingData,
    open,
    close,
    isEditMode,
    reset,
  }
}
