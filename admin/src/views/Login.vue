<template>
  <div class="section">
    <div class="container login-container">
      <form method="post" @submit.prevent="handleSubmitLogin">
        <div class="field">
          <p class="help is-danger" v-if="error">
            {{error}}
          </p>
        </div>
        <div class="field">
          <div class="control">
            <input
              type="text"
              class="input"
              name="username"
              v-model="username"
              placeholder="Masukan username..."
            />
          </div>
        </div>
        <div class="field">
          <div class="control">
            <input
              type="password"
              class="input"
              name="password"
              v-model="password"
              placeholder="Masukan password..."
            />
          </div>
        </div>
        <div class="field">
          <div class="control">
            <button class="button is-primary is-fullwidth">
              Login
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { api } from '@/api'

export default {
  name: 'Login',

  components: {
  },

  data () {
    return {
      error: null,
      username: null,
      password: null
    }
  },

  methods: {
    async handleSubmitLogin () {
      delete api.defaults.headers.common.Authorization

      try {
        const { data } = await api.post('/admin/login', {
          username: this.username,
          password: this.password
        })

        api.defaults.headers.common.Authorization = 'Bearer ' + data.token
        this.$root.activateRevokeTokenPoll()
        this.$router.push('/list')
      } catch (err) {
        if (err.response.status === 400) {
          this.error = 'Harap masukan input dengan benar!'
        } else if (err.response.status === 401) {
          this.error = 'Username atau password salah!'
        } else if (err.response.status === 500) {
          this.error = 'Terjadi kendala di server'
        } else {
          this.error = 'Terjadi kesalahan, periksa koneksi anda'
        }
      }

      this.username = null
      this.password = null
    }
  }
}
</script>

<style lang="scss" scoped>
.container.login-container {
  max-width: 300px;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
