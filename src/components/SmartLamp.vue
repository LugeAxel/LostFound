<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useI18n } from '../i18n'
import { API_URL } from '@/config/api'
import { getAuthHeaders } from '../composables/useAuth'

const { t } = useI18n()

const showTips = ref(true)
const isOpen = ref(false)
const currentTip = ref(0)
let rotateInterval: ReturnType<typeof setInterval> | null = null

const tipKeys: string[] = ['tip.1', 'tip.2', 'tip.3', 'tip.4', 'tip.5', 'tip.6', 'tip.7']

const currentTipText = computed(() => t(tipKeys[currentTip.value]!))

const startRotation = () => {
  stopRotation()
  rotateInterval = setInterval(() => {
    currentTip.value = (currentTip.value + 1) % tipKeys.length
  }, 12000)
}

const stopRotation = () => {
  if (rotateInterval) {
    clearInterval(rotateInterval)
    rotateInterval = null
  }
}

const toggle = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) startRotation()
  else stopRotation()
}

const nextTip = () => {
  currentTip.value = (currentTip.value + 1) % tipKeys.length
}

onMounted(async () => {
  try {
    const res = await axios.get(`${API_URL}/api/profile/me`, { headers: await getAuthHeaders() })
    showTips.value = res.data.profile?.show_tips !== false
  } catch {
    showTips.value = true
  }
})

onUnmounted(() => {
  stopRotation()
})
</script>

<template>
  <div v-if="showTips" class="fixed bottom-26 md:bottom-4 right-4 z-[51]">
    <!-- Tip popover -->
    <div v-if="isOpen"
      class="absolute bottom-16 right-0 w-72 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#e0e4df] dark:border-[#374151] overflow-hidden mb-2">
      <!-- Arrow -->
      <div class="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-[#1e1e1e] border-r border-b border-[#e0e4df] dark:border-[#374151] rotate-45"></div>

      <div class="p-4">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-xl bg-[#fef3c7] flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[#f59e0b] text-xl">tips_and_updates</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-[#92400e] dark:text-[#fbbf24] mb-1 uppercase tracking-wider">{{ t('tutorial.tip_title') }}</p>
            <p class="text-sm text-[#1c1b1b] dark:text-[#f3f4f6] leading-relaxed">{{ currentTipText }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between mt-4 pt-3 border-t border-[#e0e4df] dark:border-[#374151]">
          <div class="flex gap-1">
            <span v-for="(_, i) in tipKeys" :key="i"
              :class="['w-1.5 h-1.5 rounded-full transition-all duration-300', i === currentTip ? 'bg-[#f59e0b] w-3' : 'bg-[#d1d5db] dark:bg-[#4b5563]']">
            </span>
          </div>
          <div class="flex gap-2">
            <button @click="nextTip" class="text-[10px] font-bold text-[#387b41] hover:underline flex items-center gap-1">
              {{ t('search.next') }}
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
            <button @click="isOpen = false; stopRotation()"
              class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] transition-colors">
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Lamp button -->
    <button @click="toggle"
      class="w-12 h-12 rounded-full bg-[#387b41] text-white shadow-lg hover:bg-[#2d6334] hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
      :title="isOpen ? 'Close tips' : 'Show tips'">
      <span class="material-symbols-outlined text-2xl">{{ isOpen ? 'close' : 'lightbulb' }}</span>
    </button>
  </div>
</template>
