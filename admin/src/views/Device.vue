<template>
  <div class="section">
    <div class="container device-container">
      <form method="post" @submit.prevent="handleSave">
        <div class="field" v-if="this.$route.params.id">
          <div class="control has-text-right">
            <a @click="handleDelete" class="button is-danger">
              <span>
                Hapus
              </span>
              <span class="icon">
                <i class="fas fa-trash"></i>
              </span>
            </a>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">
              Nama
            </label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <input type="text" class="input" v-model="name" placeholder="Tulis nama perangkat...">
              </div>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">
              Deskripsi
            </label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <textarea class="textarea" v-model="description" placeholder="Tulis deskripsi perangkat...">
                </textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">
              Secret Key
            </label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <input type="text" class="input" v-model="secretKey" placeholder="Tulis secret key...">
              </div>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <div class="buttons">
                  <button class="button is-primary">
                    Simpan
                  </button>
                  <router-link to="/list" class="button is-secondary">
                    Batal
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { api } from '@/api'

export default {
  name: 'Device',

  components: {
  },

  data () {
    return {
      name: null,
      description: null,
      secretKey: null
    }
  },

  async mounted () {
    if (!api.defaults.headers.common.Authorization) {
      return this.$router.push('/')
    }

    if (this.$route.params.id) {
      const { data } = await api.get(`/device/${this.$route.params.id}/logs`)
      this.name = data.name
      this.description = data.description
      this.secretKey = data.secret_key
    }
  },

  methods: {
    async handleDelete () {
      if (this.$route.params.id) {
        await api.delete('/device/' + this.$route.params.id)
        return this.$router.push('/list')
      }
    },

    async handleSave () {
      if (!this.$route.params.id) {
        await api.post('/device/add', {
          name: this.name,
          description: this.description,
          secret_key: this.secretKey
        })

        return this.$router.push('/list')
      }

      if (this.$route.params.id) {
        await api.put('/device/' + this.$route.params.id, {
          name: this.name,
          description: this.description,
          secret_key: this.secretKey
        })

        return this.$router.push('/list')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.device-container {
  max-width: 600px;
}
</style>
