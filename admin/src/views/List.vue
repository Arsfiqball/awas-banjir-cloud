<template>
  <div style="margin: 1.5rem;">
    <div style="margin-bottom: 1.5rem;">
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
          <form @submit.prevent="load">
            <input type="text" class="input" v-model="search" placeholder="Cari perangkat...">
          </form>
        </div>
      </div>
    </div>
    <div>
      <table class="table is-hoverable is-fullwidth">
        <tbody>
          <tr v-for="device in devices" :key="device.id">
            <td>
              {{device.name}}
            </td>
            <td>
              {{device.description}}
            </td>
            <td style="width: 60px;">
              <router-link :to="'/device/' + device._id">
                <span class="icon">
                  <i class="fas fa-pencil-alt"></i>
                </span>
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
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

    this.load()
  },

  methods: {
    async load () {
      try {
        const appendSearch = this.search ? '?search=' + this.search : ''
        const res = await api.get('/device/list' + appendSearch)
        this.devices = res.data
      } catch (err) {
        this.$root.forceLogoutOn401(err)
      }
    },

    handleLogout () {
      delete api.defaults.headers.common.Authorization
      this.$root.deactivateRevokeTokenPoll()
      this.$router.push('/')
    }
  }
}
</script>
