import { ref } from 'vue'
import axios from 'axios'
import { API_URL } from '@/config/api'
import { supabase } from '@/lib/supabase'
import { getAuthHeaders } from './useAuth'

export function useWebPush() {
  const isSupported = ref(false)
  const isSubscribed = ref(false)
  const permissionState = ref<NotificationPermission | null>(null)

  const checkSupport = () => {
    isSupported.value = 'serviceWorker' in navigator && 'PushManager' in window
    permissionState.value = 'Notification' in window ? Notification.permission : null
    return isSupported.value
  }

  const getVapidPublicKey = async (): Promise<string | null> => {
    try {
      const res = await axios.get(`${API_URL}/api/push/vapid-key`)
      return res.data.publicKey
    } catch {
      console.error('Failed to fetch VAPID public key')
      return null
    }
  }

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/push-sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing!.addEventListener('statechange', () => {
            if (registration.active) resolve()
          })
        })
      }

      return registration
    } catch (error) {
      console.error('Service worker registration failed:', error)
      return null
    }
  }

  const subscribe = async () => {
    if (!checkSupport()) {
      console.warn('Push notifications not supported in this browser')
      return false
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      let registration = await navigator.serviceWorker.getRegistration() as ServiceWorkerRegistration | null
      if (!registration) {
        registration = await registerServiceWorker()
      }
      if (!registration) return false

      let subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        isSubscribed.value = true
        return true
      }

      if (Notification.permission === 'denied') {
        permissionState.value = 'denied'
        return false
      }

      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission()
        permissionState.value = result
        if (result !== 'granted') return false
      }

      const vapidKey = await getVapidPublicKey()
      if (!vapidKey) return false

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await axios.post(`${API_URL}/api/push/subscribe`, {
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
      }, { headers: await getAuthHeaders() })

      isSubscribed.value = true
      permissionState.value = 'granted'
      return true
    } catch (error) {
      console.error('Push subscription failed:', error)
      return false
    }
  }

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return

      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return

      await axios.post(`${API_URL}/api/push/unsubscribe`, {
        endpoint: subscription.endpoint,
      }, { headers: await getAuthHeaders() })

      await subscription.unsubscribe()
      isSubscribed.value = false
    } catch (error) {
      console.error('Push unsubscribe failed:', error)
    }
  }

  return {
    isSupported,
    isSubscribed,
    permissionState,
    checkSupport,
    registerServiceWorker,
    subscribe,
    unsubscribe,
  }
}
