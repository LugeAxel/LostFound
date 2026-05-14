import axios from 'axios'
import { API_URL } from './api'
import { useCache } from '../composables/useCache'

const http = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

const { get: cacheGet, set: cacheSet, invalidate: cacheInvalidate } = useCache()

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const config = error.config
    if (!config || config._retryCount >= 1) {
      return Promise.reject(error)
    }
    config._retryCount = (config._retryCount || 0) + 1
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
    await delay(1000)
    return http(config)
  },
)

export { http, cacheInvalidate }
export default http
