import { onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

export function useRealtimeItems(onChange: () => void) {
  let subscription: any = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const debouncedOnChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      onChange()
    }, 500)
  }

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
        () => { debouncedOnChange() }
      )
      .subscribe()
  }

  const unsubscribe = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (subscription) {
      supabase.removeChannel(subscription)
      subscription = null
    }
  }

  onUnmounted(() => unsubscribe())

  return { subscribe, unsubscribe }
}
