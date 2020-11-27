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
      try {
        const { data } = await api.post('/admin/login', {
          username: this.username,
          password: this.password
        })

        api.defaults.headers.common.Authorization = 'Bearer ' + data
        this.$router.push('/list')
      } catch (err) {
        this.error = err.response.data || err.response.statusText || 'Terjadi galat!'
      }
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
