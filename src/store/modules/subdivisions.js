import { fetchSubdivisions } from "../../services/subdivisionsService.js"

const STORAGE_KEY = "subdivision"

const normalizeSubdivisionId = (value) => {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const state = {
  list: [],
  currentId: normalizeSubdivisionId(localStorage.getItem(STORAGE_KEY)),
  isLoading: false,
  isInitialized: false,
  error: null,
}

const getters = {
  subdivisions: (state) => state.list,
  subdivision: (state) => state.currentId,
  currentSubdivision: (state) =>
    state.list.find((item) => item.id === state.currentId) ?? null,
}

const actions = {
  async loadSubdivisions({ commit }) {
    commit("setLoading", true)
    commit("setError", null)

    try {
      const subdivisions = await fetchSubdivisions()
      commit("setSubdivisions", subdivisions.data)
      return subdivisions.data
    } catch (error) {
      commit("setSubdivisions", [])
      commit("setError", error)
      console.error("Ошибка загрузки подразделений:", error)
      return []
    } finally {
      commit("setLoading", false)
    }
  },
  setSubdivision({ commit }, value) {
    const subdivisionId = normalizeSubdivisionId(value)

    commit("setCurrentId", subdivisionId)

    if (subdivisionId === null) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    localStorage.setItem(STORAGE_KEY, String(subdivisionId))
  },
  async initSubdivisions({ dispatch, commit, state, getters }) {
    await dispatch("loadSubdivisions")

    if (state.currentId === null) {
      commit("setInitialized", true)
      return
    }

    if (!getters.currentSubdivision) {
      dispatch("setSubdivision", null)
    }

    commit("setInitialized", true)
  },
}

const mutations = {
  setSubdivisions(state, subdivisions) {
    state.list = Array.isArray(subdivisions) ? subdivisions : []
  },
  setCurrentId(state, value) {
    state.currentId = value
  },
  setLoading(state, value) {
    state.isLoading = value
  },
  setInitialized(state, value) {
    state.isInitialized = value
  },
  setError(state, error) {
    state.error = error
  },
}

export default {
  namespaced: true,
  state,
  actions,
  mutations,
  getters,
}
