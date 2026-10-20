import { createRouter, createWebHistory } from 'vue-router'
import PublicOutlay from '@/views/PublicOutlay.vue'
export default createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes: [{ path: '/outlay/:uuid', alias: '/outlay/show/:uuid', name: 'Публичная смета', component: PublicOutlay }],
})
