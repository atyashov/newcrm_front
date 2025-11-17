import axios from 'axios';
// import { deleteCookie, getCookie, setCookie } from '@utils/cookies.js';
import {API, TOKEN_USER_NAME} from "../../api.js";

const API_GET_USER_URL = API+'/user';

const state = {
    user: {},
    subdivision: localStorage.getItem('subdivision') || null,
};
const getters = {
    user: (state) => (data) => {
        console.log(data);
        return state.user;
    },
    subdivision: (state) => state.subdivision
};
const actions = {
    async getUser({ commit }) {
        // const token = getCookie(COOKIE_USER_NAME);
        const token = localStorage.getItem(TOKEN_USER_NAME)
        const config = {
            headers: { Authorization: `Bearer ${token}` },
        };
        await axios
            .get(API_GET_USER_URL, config)
            .then((res) => res.data)
            .then((data) => {
                console.log(data);
                commit('setUser', data);
            });
    },
    logoutUser() {
        const token = localStorage.getItem(TOKEN_USER_NAME) || null;
        if (token) {
            localStorage.removeItem(TOKEN_USER_NAME)
            return true;
        }
    },
    setSubdivision({ commit }, value) {
        commit('SET_SUBDIVISION', value);
    }
};
const mutations = {
    setUser(state, userData) {
        state.user = userData;
    },
    SET_SUBDIVISION(state, value) {
        state.subdivision = value;
        return localStorage.setItem('subdivision', value) || null;
    }

};

export default {
    namespaced: true,
    state,
    actions,
    getters,
    mutations,
};
