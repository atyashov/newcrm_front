import { reactive } from "vue"

const notification = reactive({
  visible: false,
  title: "",
  message: "",
  color: "info",
  icon: { component: "notifications", color: "white" },
  timeoutId: null,
})

const showSuccess = (message) => {
  if (notification.timeoutId) {
    clearTimeout(notification.timeoutId)
  }

  notification.title = "Успешно"
  notification.message = message
  notification.color = "success"
  notification.icon = { component: "done", color: "white" }
  notification.visible = true

  notification.timeoutId = setTimeout(() => {
    notification.visible = false
  }, 3000)
}

const showError = (message) => {
  if (notification.timeoutId) {
    clearTimeout(notification.timeoutId)
  }

  notification.title = "Ошибка"
  notification.message = message
  notification.color = "danger"
  notification.icon = { component: "error", color: "white" }
  notification.visible = true

  notification.timeoutId = setTimeout(() => {
    notification.visible = false
  }, 3000)
}

const showInfo = (message) => {
  if (notification.timeoutId) {
    clearTimeout(notification.timeoutId)
  }

  notification.title = "Информация"
  notification.message = message
  notification.color = "info"
  notification.icon = { component: "info", color: "white" }
  notification.visible = true

  notification.timeoutId = setTimeout(() => {
    notification.visible = false
  }, 3000)
}

const clearNotification = () => {
  notification.visible = false
  if (notification.timeoutId) {
    clearTimeout(notification.timeoutId)
    notification.timeoutId = null
  }
}

export { notification, showSuccess, showError, showInfo, clearNotification }
