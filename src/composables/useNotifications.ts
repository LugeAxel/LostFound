import { ref, onUnmounted } from 'vue'
import axios from 'axios'
import { supabase } from '../lib/supabase'
import { API_URL } from '@/config/api'
import { getAuthHeaders } from './useAuth'

export function useNotifications() {
  const notifications = ref<any[]>([])
  const unreadCount = ref(0)
  let subscription: any = null
  let userId: string | null = null
  let syncInterval: ReturnType<typeof setInterval> | null = null

  const fetchNotifications = async (uid: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching notifications:', error.message)
      return
    }

    notifications.value = data
    unreadCount.value = data.filter((n: any) => !n.is_read).length
  }

  const refreshUnreadCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await axios.get(`${API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const serverCount = res.data.count
      if (serverCount !== unreadCount.value) {
        await fetchNotifications(session.user.id)
      }
    } catch {
      // silent — background sync can fail gracefully
    }
  }

  const subscribeToNotifications = (uid: string) => {
    userId = uid
    subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${uid}`
        },
        (payload) => {
          notifications.value.unshift(payload.new)
          unreadCount.value++
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${uid}`
        },
        (payload) => {
          const index = notifications.value.findIndex((n: any) => n.id === payload.new.id)
          if (index !== -1) {
            notifications.value[index] = payload.new
            unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${uid}`
        },
        (payload) => {
          const index = notifications.value.findIndex((n: any) => n.id === payload.old.id)
          if (index !== -1) {
            notifications.value.splice(index, 1)
            unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length
          }
        }
      )
      .subscribe()

    syncInterval = setInterval(refreshUnreadCount, 60_000)
  }

  const markAsRead = async (notificationId: string) => {
    const notif = notifications.value.find((n: any) => n.id === notificationId)
    if (!notif || notif.is_read) return

    notif.is_read = true
    unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length

    try {
      await axios.post(`${API_URL}/api/notifications/${notificationId}/read`, {}, { headers: await getAuthHeaders() })
    } catch (error: any) {
      notif.is_read = false
      unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length
      console.error('Error marking notification as read:', error.response?.data?.message || error.message)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    const index = notifications.value.findIndex((n: any) => n.id === notificationId)
    const removed = index !== -1 ? notifications.value.splice(index, 1)[0] : null
    unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length

    try {
      await axios.delete(`${API_URL}/api/notifications/${notificationId}`, { headers: await getAuthHeaders() })
    } catch (error: any) {
      if (removed) {
        notifications.value.splice(index, 0, removed)
        unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length
      }
      if (error.response?.status !== 404) {
        console.error('Error deleting notification:', error.response?.data?.message || error.message)
      }
    }
  }

  const deleteAllNotifications = async () => {
    const previous = [...notifications.value]
    const previousCount = unreadCount.value
    notifications.value = []
    unreadCount.value = 0

    try {
      await axios.delete(`${API_URL}/api/notifications`, { headers: await getAuthHeaders() })
    } catch (error: any) {
      notifications.value = previous
      unreadCount.value = previousCount
      console.error('Error deleting all notifications:', error.response?.data?.message || error.message)
    }
  }

  const unsubscribe = () => {
    if (syncInterval) {
      clearInterval(syncInterval)
      syncInterval = null
    }
    if (subscription) {
      supabase.removeChannel(subscription)
      subscription = null
    }
    userId = null
  }

  onUnmounted(() => {
    unsubscribe()
  })

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    subscribeToNotifications,
    markAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshUnreadCount,
    unsubscribe
  }
}
