import { onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

export function useRealtimeAllItems(onChange: () => void, debounceMs = 1000) {
  let subscription: any = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const debouncedOnChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      onChange()
    }, debounceMs)
  }

  const subscribe = () => {
    unsubscribe()
    subscription = supabase
      .channel('all-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
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
