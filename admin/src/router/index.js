import Vue from 'vue'
import VueRouter from 'vue-router'
import Login from '../views/Login.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  }, {
    path: '/list',
    name: 'List',
    component: () => import('../views/List.vue')
  }, {
    path: '/device/add',
    name: 'DeviceAdd',
    component: () => import('../views/Device.vue')
  }, {
    path: '/device/:id',
    name: 'Device',
    component: () => import('../views/Device.vue')
  }
]

const router = new VueRouter({
  routes
})

export default router
