import { onUnmounted, watch, type Ref } from 'vue'
import { supabase } from '../lib/supabase'

export function useRealtimeSingleItem(itemId: Ref<string | null | undefined>, onChange: () => void) {
  let subscription: any = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const debouncedOnChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      onChange()
    }, 300)
  }

  const subscribe = () => {
    unsubscribe()
    const id = itemId.value
    if (!id) return
    subscription = supabase
      .channel(`item-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `id=eq.${id}`
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

  watch(itemId, () => { subscribe() }, { immediate: true })

  onUnmounted(() => unsubscribe())

  return { subscribe, unsubscribe }
}
