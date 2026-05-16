import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

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
      .subscribe()
  }

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error.message)
      return
    }

    const index = notifications.value.findIndex((n: any) => n.id === notificationId)
    if (index !== -1) {
      notifications.value[index].is_read = true
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
    markAsRead,
    unsubscribe
  }
}
