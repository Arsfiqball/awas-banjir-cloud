<template>
  <div class="section">
    <div class="container login-container">
      <form method="post" @submit.prevent="handleSubmitLogin">
        <div class="field">
          <div class="control">
            <input
              type="text"
              class="input"
              name="token"
              v-model="token"
              placeholder="Masukan token..."
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
export default {
  name: 'Login',

  components: {
  },

  data () {
    return {
      token: null
    }
  },

  methods: {
    handleSubmitLogin () {
      this.$router.push('/list')
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
