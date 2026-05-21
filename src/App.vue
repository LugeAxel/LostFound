<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterView } from 'vue-router'
import { createI18n, provideI18n } from './i18n'
import { provideToast } from './composables/useToast'
import Toast from './components/Toast.vue'

const i18n = createI18n()
provideI18n(i18n)
provideToast()

const isOnline = ref(navigator.onLine)

const handleOnline = () => { isOnline.value = true }
const handleOffline = () => { isOnline.value = false }

// Prevent select, copy, drag, and context menu actions
const preventContextMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }
  e.preventDefault()
}

const preventDragStart = (e: DragEvent) => {
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }
  e.preventDefault()
}

const preventSelectStart = (e: Event) => {
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }
  e.preventDefault()
}

const preventKeyboardShortcuts = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement
  const isEditable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  
  if (isEditable) return
  
  const isCmdOrCtrl = e.ctrlKey || e.metaKey
  const key = e.key.toLowerCase()
  // Block copy/cut/all-select shortcuts
  if (isCmdOrCtrl && ['c', 'x', 'a', 's', 'u'].includes(key)) {
    e.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  document.addEventListener('contextmenu', preventContextMenu)
  document.addEventListener('dragstart', preventDragStart)
  document.addEventListener('selectstart', preventSelectStart)
  document.addEventListener('keydown', preventKeyboardShortcuts)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  
  document.removeEventListener('contextmenu', preventContextMenu)
  document.removeEventListener('dragstart', preventDragStart)
  document.removeEventListener('selectstart', preventSelectStart)
  document.removeEventListener('keydown', preventKeyboardShortcuts)
})
</script>

<template>
  <div v-if="!isOnline" class="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center text-xs font-bold py-2 px-4">
    ⚠️ You are offline. Some features may not work.
  </div>
  <RouterView v-slot="{ Component }">
    <transition name="page-fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </RouterView>
  <Toast />
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

body {
  font-family: 'Inter', sans-serif;
  margin: 0;
  padding: 0;
  background-color: var(--background, #fcf9f8);
  color: var(--on-surface, #1c1b1b);
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* ── Fluid Typography ── */
h1, .h1 { font-size: clamp(1.5rem, 4vw, 2.5rem); }
h2, .h2 { font-size: clamp(1.25rem, 3vw, 2rem); }
h3, .h3 { font-size: clamp(1.1rem, 2.5vw, 1.5rem); }
h4, .h4 { font-size: clamp(1rem, 2vw, 1.25rem); }

/* ── Responsive container padding ── */
.content-container {
  padding-left: clamp(0.75rem, 3vw, 2rem);
  padding-right: clamp(0.75rem, 3vw, 2rem);
}

/* ── Hide scrollbar for horizontal scroll areas ── */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* ── Line clamp utility ── */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Responsive card adjustments ── */
@media (max-width: 640px) {
  .card-compact { padding: 0.75rem; }
  .card-compact h4 { font-size: 0.875rem; }
}

/* ── Safe area for mobile browsers ── */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
}
</style>
