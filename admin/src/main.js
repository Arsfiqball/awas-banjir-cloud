import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import './main.scss'

import { api } from '@/api'

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App),

  data: {
    timerRevokeTokenId: null
  },

  methods: {
    forceLogoutOn401 (err) {
      if (err.response.status === 401) {
        this.$router.push('/')
      }

      delete api.defaults.headers.common.Authorization
      console.log(err)
    },

    activateRevokeTokenPoll () {
      // revoke token every 30 minutes
      this.timerRevokeTokenId = setInterval(async () => {
        try {
          const { data } = await api.get('/admin/revoke-token')
          api.defaults.headers.common.Authorization = 'Bearer ' + data.token
        } catch (err) {
          this.forceLogoutOn401(err)
        }
      }, 30 * 60 * 1000)
    },

    deactivateRevokeTokenPoll () {
      if (this.timerRevokeTokenId) {
        clearInterval(this.timerRevokeTokenId)
      }
    }
  }
}).$mount('#app')
