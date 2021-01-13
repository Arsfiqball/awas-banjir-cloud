<template>
  <div style="margin: 1.5rem;">
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
    <div style="margin-bottom: 1.5rem;">
      <div class="field is-grouped">
        <div class="control">
          <router-link to="/list" class="button is-secondary">
            <span class="icon">
              <i class="fas fa-arrow-left"></i>
            </span>
            <span>
              Kembali
            </span>
          </router-link>
        </div>
        <div class="control">
          <button class="button is-primary" @click="handleSave">
            <span class="icon">
              <i class="fas fa-save"></i>
            </span>
            <span>
              Simpan
            </span>
          </button>
        </div>
        <div class="control is-expanded"></div>
        <div class="control has-text-right" v-if="this.$route.params.id">
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
    </div>
    <div class="columns">
      <div class="column is-8">
        <div class="field is-horizontal" v-if="this.$route.params.id">
          <div class="field-label is-normal">
            <label class="label has-text-left">
              ID
            </label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <input type="text" class="input" style="background: #eee;" :value="this.$route.params.id" placeholder="Id perangkat..." readonly>
              </div>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label has-text-left">
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
            <label class="label has-text-left">
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
            <label class="label has-text-left">
              Secret Key
            </label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <textarea rows="4" style="white-space: pre; overflow-wrap: normal; overflow-x: auto;" class="textarea" v-model="secretKey" placeholder="Tulis secret key..."></textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label has-text-left">
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
      </div>
      <div class="column is-4">
        <div ref="map_element" style="width: 100%; height: 400px; border-radius: 8px;"></div>
        <a style="margin: 1rem 0; display: block;" class="has-text-primary" @click="enableChangeCoordinate = !enableChangeCoordinate">
          <span class="icon">
            <i v-if="enableChangeCoordinate" class="fa fa-check-square"></i>
            <i v-if="!enableChangeCoordinate" class="fa fa-square"></i>
          </span>
          <span>
            Klik untuk mengubah lokasi perangkat
          </span>
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '@/api'
import L from 'leaflet'

const source = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const markerIcon = L.icon({
  iconUrl: '/marker.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -36]
})

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
      modalConfirmDeleteIsActive: false,
      enableChangeCoordinate: false,
      map: null,
      marker: null
    }
  },

  async mounted () {
    const tileLayer = new L.TileLayer(source, { attribution })
    const initCoords = [-6.032676394740438, 106.06046800205338]

    this.map = new L.Map(this.$refs.map_element, {
      center: initCoords,
      zoom: 13,
      layers: [tileLayer]
    })

    this.map.on('click', e => {
      if (this.enableChangeCoordinate) {
        this.latitude = e.latlng.lat
        this.longitude = e.latlng.lng

        if (!this.marker) {
          this.marker = L
            .marker([e.latlng.lat, e.latlng.lng], { icon: markerIcon })
            .addTo(this.map)
        } else {
          this.marker.setLatLng(new L.LatLng(e.latlng.lat, e.latlng.lng))
        }
      }
    })

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

        if (data.coordinate) {
          const { latitude, longitude } = data.coordinate

          this.marker = L
            .marker([latitude, longitude], { icon: markerIcon })
            .addTo(this.map)

          this.map.setView([latitude, longitude], 12)
        }
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
.modal {
  z-index: 9999;
}
</style>
