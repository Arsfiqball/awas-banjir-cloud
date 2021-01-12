<template>
  <div class="section">
    <div class="container device-container">
      <div :class="['modal', modalConfirmDeleteIsActive ? 'is-active' : null]">
        <div class="modal-background"></div>
        <div class="modal-content">
          <header class="modal-card-head">
            <p class="modal-card-title">Konfirmasi</p>
          </header>
          <div class="modal-card-body">
            <p>Apakah anda yakin ingin menghapus device ini dari database? Harap diingat bahwa entitas tidak akan kembali setelah dihapus!</p>
          </div>
          <div class="modal-card-foot">
            <a @click="handleDelete" class="button is-danger">
              Ya
            </a>
            <a class="button is-secondary" @click="modalConfirmDeleteIsActive = false">
              Tidak
            </a>
          </div>
        </div>
        <button @click="modalConfirmDeleteIsActive = false" class="modal-close is-large" aria-label="close"></button>
      </div>
      <form method="post" @submit.prevent="handleSave">
        <div class="field" v-if="this.$route.params.id">
          <div class="control has-text-right">
            <a @click="modalConfirmDeleteIsActive = true" class="button is-danger">
              <span>
                Hapus
              </span>
              <span class="icon">
                <i class="fas fa-trash"></i>
              </span>
            </a>
          </div>
        </div>
        <div class="field is-horizontal" v-if="this.$route.params.id">
          <div class="field-label is-normal">
            <label class="label">
              ID
            </label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <input type="text" class="input" :value="this.$route.params.id" placeholder="Id perangkat..." readonly>
              </div>
            </div>
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
              Koordinat
            </label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <input type="text" class="input" v-model="latitude" placeholder="Tulis koordinat latitude...">
              </div>
            </div>
            <div class="field">
              <div class="control">
                <input type="text" class="input" v-model="longitude" placeholder="Tulis koordinat longitude...">
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
                <textarea rows="6" class="textarea" v-model="secretKey" placeholder="Tulis secret key..."></textarea>
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
      latitude: null,
      longitude: null,
      secretKey: null,
      modalConfirmDeleteIsActive: false
    }
  },

  async mounted () {
    if (!api.defaults.headers.common.Authorization) {
      return this.$router.push('/')
    }

    if (this.$route.params.id) {
      try {
        const { data } = await api.get(`/device/${this.$route.params.id}`)
        this.name = data.name
        this.description = data.description
        this.latitude = data.coordinate?.latitude
        this.longitude = data.coordinate?.longitude
        this.secretKey = data.secret_key
      } catch (err) {
        this.$root.forceLogoutOn401(err)
      }
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
          coordinate: this.latitude + ',' + this.longitude,
          secret_key: this.secretKey
        })

        return this.$router.push('/list')
      }

      if (this.$route.params.id) {
        await api.put('/device/' + this.$route.params.id, {
          name: this.name,
          description: this.description,
          coordinate: this.latitude + ',' + this.longitude,
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
