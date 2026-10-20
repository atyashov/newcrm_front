import { fetchMenus } from "../../services/menuService.js"

const state = {
  menus: [], // Массив для хранения данных меню
}

const getters = {
  menus: (state) => state.menus,
  treeMenus: (state) => {
    const buildTree = (items) => {
      // Сортировка по sort_order
      items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

      const map = new Map()
      items.forEach((item) => map.set(item.id, { ...item, children: [] }))

      const tree = []
      items.forEach((item) => {
        if (item.parent === 0) {
          tree.push(map.get(item.id))
        } else {
          const parent = map.get(item.parent)
          if (parent) {
            parent.children.push(map.get(item.id))
          }
        }
      })
      return tree
    }
    return buildTree(state.menus)
  },
}

const actions = {
  async loadMenus({ commit }) {
    try {
      const menus = await fetchMenus() // Вызов функции из сервиса
      commit("setMenus", menus) // Сохранение в state
    } catch (error) {
      console.error("Ошибка загрузки меню:", error)
    }
  },
}

const mutations = {
  setMenus(state, menus) {
    state.menus = menus.map((item) =>
      ["consumption-group", "consumption-groups"].includes(item.path)
        ? { ...item, path: "expense-groups" }
        : item,
    )
  },
}

export default {
  namespaced: true, // Включаем namespace для доступа как 'menu/...'
  state,
  actions,
  getters,
  mutations,
}
