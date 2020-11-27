<template>
  <div class="section">
    <div class="container" style="margin-bottom: 1.5rem;">
      <div class="field is-grouped">
        <div class="control">
          <router-link to="/device/add" class="button is-secondary">
            <span class="icon">
              <i class="fas fa-plus"></i>
            </span>
            <span>
              Tambahkan
            </span>
          </router-link>
        </div>
        <div class="control is-expanded">
          <input type="text" class="input" v-model="search" placeholder="Cari perangkat...">
        </div>
        <div class="control">
          <a @click="handleLogout" class="button is-secondary">
            <span class="icon">
              <i class="fas fa-power-off"></i>
            </span>
            <span>
              Log Out
            </span>
          </a>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="columns is-multiline">
        <div class="column is-4" v-for="device in devices" :key="device.id">
          <div class="card">
            <div class="card-header">
              <div class="card-header-title">
                {{device.name}}
              </div>
              <router-link :to="'/device/' + device._id" class="card-header-icon">
                <span class="icon">
                  <i class="fas fa-pencil-alt"></i>
                </span>
              </router-link>
            </div>
            <div class="card-content">
              {{device.description}}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '@/api'

export default {
  name: 'List',

  components: {
  },

  data () {
    return {
      devices: [],
      search: null
    }
  },

  async mounted () {
    if (!api.defaults.headers.common.Authorization) {
      return this.$router.push('/')
    }

    const res = await api.get('/device/list')
    this.devices = res.data
  },

  methods: {
    handleLogout () {
      delete api.defaults.headers.common.Authorization
      this.$router.push('/')
    }
  }
}
</script>
