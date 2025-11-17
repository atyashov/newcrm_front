import {createRouter, createWebHistory} from 'vue-router'
// import Login from "../pages/auth/Login.vue"
import SignIn from '../pages/auth/SignIn.vue'

const routes = [
    {
        path: '/',
        redirect: { path: '/login' },
        children: [
            {
                path: '/login',
                name: 'login',
                component: SignIn,
            }
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/',
    }
]

export default createRouter({
    history: createWebHistory(),
    routes: routes
})
