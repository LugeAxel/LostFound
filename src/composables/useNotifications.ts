import { ref, onUnmounted } from 'vue'
import axios from 'axios'
import { supabase } from '../lib/supabase'
import { API_URL } from '@/config/api'
import { getAuthHeaders } from './useAuth'

export function useNotifications() {
  const notifications = ref<any[]>([])
  const unreadCount = ref(0)
  let subscription: any = null

  const fetchNotifications = async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching notifications:', error.message)
      return
    }

    notifications.value = data
    unreadCount.value = data.filter((n: any) => !n.is_read).length
  }

  const subscribeToNotifications = (userId: string) => {
    subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
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
          filter: `user_id=eq.${userId}`
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
          filter: `user_id=eq.${userId}`
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
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await axios.delete(`${API_URL}/api/notifications/${notificationId}`, { headers: await getAuthHeaders() })
    } catch (error: any) {
      console.error('Error deleting notification:', error.response?.data?.message || error.message)
      return
    }

    const index = notifications.value.findIndex((n: any) => n.id === notificationId)
    if (index !== -1) {
      notifications.value.splice(index, 1)
      unreadCount.value = notifications.value.filter((n: any) => !n.is_read).length
    }
  }

  const unsubscribe = () => {
    if (subscription) {
      supabase.removeChannel(subscription)
      subscription = null
    }
  }

  onUnmounted(() => {
    unsubscribe()
  })

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    subscribeToNotifications,
    deleteNotification,
    unsubscribe
  }
}
