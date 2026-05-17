import { onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

export function useRealtimeItems(onChange: () => void) {
  let subscription: any = null

  const subscribe = (userId: string) => {
    unsubscribe()
    subscription = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `reporter=eq.${userId}`
        },
        () => { onChange() }
      )
      .subscribe()
  }

  const unsubscribe = () => {
    if (subscription) {
      supabase.removeChannel(subscription)
      subscription = null
    }
  }

  onUnmounted(() => unsubscribe())

  return { subscribe, unsubscribe }
}
