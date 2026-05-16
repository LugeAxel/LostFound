import axios from 'axios'
import { API_URL } from './api'
import { useCache } from '../composables/useCache'
import { supabase } from '../lib/supabase'

const http = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

const { get: cacheGet, set: cacheSet, invalidate: cacheInvalidate } = useCache()

http.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
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
