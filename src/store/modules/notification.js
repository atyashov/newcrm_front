const state = {
  notification: {
    title: '',
    message: '',
    icon: { component: 'info', color: 'white' },
    color: 'info',
  }
}

const mutations = {
  SET_NOTIFICATION(state, payload) {
    state.notification = {
      title: payload.title || 'Уведомление',
      message: payload.message || '',
      icon: payload.icon || { component: 'info', color: 'white' },
      color: payload.color || 'info',
    }
  },
  CLEAR_NOTIFICATION(state) {
    state.notification.message = ''
  }
}

const actions = {
  showSuccess({ commit }, message) {
    commit('SET_NOTIFICATION', {
      title: 'Успешно',
      message: message,
      icon: { component: 'done', color: 'white' },
      color: 'success'
    })
  },
  showError({ commit }, message) {
    commit('SET_NOTIFICATION', {
      title: 'Ошибка',
      message: message,
      icon: { component: 'error', color: 'white' },
      color: 'danger'
    })
  },
  clearNotification({ commit }) {
    commit('CLEAR_NOTIFICATION')
  }
}

const getters = {
  notification: (state) => state.notification
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
