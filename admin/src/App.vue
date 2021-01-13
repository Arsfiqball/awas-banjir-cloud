<template>
  <div id="app" :class="[$route.path !== '/' ? 'has-menu-bar' : null]">
    <div class="menu-bar" v-if="$route.path !== '/'">
      <div class="menu-bar-start">
        <router-link to="/stats" active-class="is-active" class="menu-bar-item">
          <div class="icon is-medium">
            <i class="fas fa-chart-bar fa-2x"></i>
          </div>
          <span class="icon-alt">
            Statistik
          </span>
        </router-link>
        <router-link to="/list" active-class="is-active" class="menu-bar-item">
          <div class="icon is-medium">
            <i class="fas fa-hdd fa-2x"></i>
          </div>
          <span class="icon-alt">
            Perangkat
          </span>
        </router-link>
        <router-link to="/map" active-class="is-active" class="menu-bar-item">
          <div class="icon is-medium">
            <i class="fas fa-map-marker-alt fa-2x"></i>
          </div>
          <span class="icon-alt">
            Sebaran
          </span>
        </router-link>
      </div>
      <div class="menu-bar-end">
        <a @click="handleLogout" class="menu-bar-item">
          <div class="icon is-medium">
            <i class="fas fa-power-off fa-2x"></i>
          </div>
          <span class="icon-alt">
            Log Out
          </span>
        </a>
      </div>
    </div>
    <router-view/>
  </div>
</template>

<script>
import { api } from '@/api'

export default {
  methods: {
    handleLogout () {
      delete api.defaults.headers.common.Authorization
      this.$root.deactivateRevokeTokenPoll()
      this.$router.push('/')
    }
  }
}
</script>

<style lang="scss">
#app.has-menu-bar {
  padding-left: 64px;
}

.menu-bar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 64px;
  background: #34495e;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .menu-bar-item {
    display: block;
    width: 64px;
    height: 64px;
    color: white;
    display: flex;
    flex-direction: column;
    text-align: center;
    align-items: center;
    justify-content: center;

    &:hover, &.is-active {
      background: darken(#34495e, 10);
    }

    .icon-alt {
      font-size: 10px;
    }
  }
}
</style>
