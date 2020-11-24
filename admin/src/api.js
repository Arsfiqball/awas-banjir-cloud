import axios from 'axios'

export const api = axios.create({
  // baseURL: process.env.VUE_APP_BASE_URL_API || 'http://localhost:8080',
  timeout: 10000
})
