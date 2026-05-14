<script setup lang="ts">
import { useToast } from '../composables/useToast';

const { toasts, removeToast } = useToast();
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <TransitionGroup name="toast">
        <div v-for="toast in toasts" :key="toast.id"
          @click="removeToast(toast.id)"
          class="pointer-events-auto cursor-pointer flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-2xl border backdrop-blur-md max-w-[90vw] sm:max-w-sm min-w-[280px] transition-all"
          :class="{
            'bg-[#387b41] text-white border-[#387b41]/30': toast.type === 'success',
            'bg-[#ba1a1a] text-white border-[#ba1a1a]/30': toast.type === 'error',
            'bg-[#1e1e1e] text-[#f3f4f6] border-[#374151]': toast.type === 'info',
          }">
          <span class="material-symbols-outlined text-xl shrink-0">
            {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium leading-relaxed">{{ toast.message }}</p>
          </div>
          <button @click.stop="removeToast(toast.id)" class="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
          <div class="absolute bottom-0 left-0 h-1 bg-white/20 rounded-full toast-progress"
            :style="{ animationDuration: toast.duration + 'ms' }"></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.25s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}
.toast-enter-to {
  opacity: 1;
  transform: translateX(0) scale(1);
}
.toast-progress {
  animation: toast-shrink linear forwards;
}
@keyframes toast-shrink {
  from { width: 100%; }
  to { width: 0%; }
}
</style>
