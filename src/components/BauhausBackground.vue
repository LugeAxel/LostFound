<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'login' | 'light'
}>()

const lightShapes = computed(() => [
  {
    id: 1,
    type: 'dot' as const,
    size: 220,
    top: '3%',
    left: '5%',
    bottom: 'auto',
    right: 'auto',
    color: 'rgba(56, 123, 65, 0.4)',
    anim: 'animate-bauhaus-float-slow',
    opacity: 1
  },
  {
    id: 2,
    type: 'square' as const,
    size: 80,
    top: '10%',
    right: '10%',
    left: 'auto',
    bottom: 'auto',
    color: 'rgba(56, 123, 65, 0.5)',
    anim: 'animate-bauhaus-spin-reverse',
    opacity: 1
  },
  {
    id: 3,
    type: 'dot' as const,
    size: 60,
    top: '50%',
    left: '52%',
    right: 'auto',
    bottom: 'auto',
    color: 'rgba(56, 123, 65, 0.5)',
    anim: 'animate-bauhaus-pulse',
    opacity: 1
  },
  {
    id: 4,
    type: 'line' as const,
    width: 140,
    height: 2,
    top: 'auto',
    left: '8%',
    right: 'auto',
    bottom: '12%',
    color: 'rgba(56, 123, 65, 0.45)',
    anim: 'animate-bauhaus-float-med',
    opacity: 1
  },
  {
    id: 5,
    type: 'dot' as const,
    size: 100,
    top: '28%',
    left: '3%',
    right: 'auto',
    bottom: 'auto',
    color: 'rgba(56, 123, 65, 0.4)',
    anim: 'animate-bauhaus-orbit-3',
    opacity: 1
  }
])

const loginShapes = computed(() => [
  { id: 1, type: 'dot' as const, size: 200, top: '3%', left: '5%', bottom: 'auto', right: 'auto', color: 'rgba(56, 123, 65, 0.4)', anim: 'animate-bauhaus-orbit-2', opacity: 1 },
  { id: 2, type: 'dot' as const, size: 120, top: '8%', right: '8%', left: 'auto', bottom: 'auto', color: 'rgba(56, 123, 65, 0.4)', anim: 'animate-bauhaus-float-slow', opacity: 1 },
  { id: 3, type: 'square' as const, size: 60, top: '45%', left: '10%', right: 'auto', bottom: 'auto', color: 'rgba(56, 123, 65, 0.5)', anim: 'animate-bauhaus-spin-reverse', opacity: 1 },
  { id: 4, type: 'line' as const, width: 80, height: 2, top: '50%', right: '12%', left: 'auto', bottom: 'auto', color: 'rgba(56, 123, 65, 0.5)', anim: 'animate-bauhaus-pulse', opacity: 1 },
  { id: 5, type: 'dot' as const, size: 50, bottom: '25%', left: '12%', top: 'auto', right: 'auto', color: 'rgba(56, 123, 65, 0.45)', anim: 'animate-bauhaus-float-fast', opacity: 1 },
  { id: 6, type: 'square' as const, size: 45, bottom: '10%', right: '8%', top: 'auto', left: 'auto', color: 'rgba(56, 123, 65, 0.4)', anim: 'animate-bauhaus-spin-slow', opacity: 1 },
  { id: 7, type: 'line' as const, width: 140, height: 2, bottom: '15%', left: '5%', top: 'auto', right: 'auto', color: 'rgba(56, 123, 65, 0.45)', anim: '', opacity: 1 },
  { id: 8, type: 'dot' as const, size: 25, top: '30%', right: '8%', left: 'auto', bottom: 'auto', color: 'rgba(56, 123, 65, 0.5)', anim: 'animate-bauhaus-pulse', opacity: 1 },
])

const shapes = computed(() => {
  if (props.variant === 'login') return loginShapes.value
  return lightShapes.value
})
</script>

<template>
  <div class="bauhaus-decor fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
    <template v-for="shape in shapes" :key="shape.id">
      <div v-if="shape.type === 'dot'"
        :class="[shape.anim, 'absolute rounded-full']"
        :style="{
          width: shape.size + 'px',
          height: shape.size + 'px',
          top: shape.top,
          left: shape.left,
          right: shape.right,
          bottom: shape.bottom,
          background: shape.color,
          opacity: shape.opacity
        }">
      </div>
      <div v-else-if="shape.type === 'square'"
        :class="[shape.anim, 'absolute']"
        :style="{
          width: shape.size + 'px',
          height: shape.size + 'px',
          top: shape.top,
          left: shape.left,
          right: shape.right,
          bottom: shape.bottom,
          background: shape.color,
          opacity: shape.opacity
        }">
      </div>
      <div v-else-if="shape.type === 'line'"
        :class="[shape.anim, 'absolute']"
        :style="{
          width: shape.width + 'px',
          height: shape.height + 'px',
          top: shape.top,
          left: shape.left,
          right: shape.right,
          bottom: shape.bottom,
          background: shape.color,
          opacity: shape.opacity
        }">
      </div>
    </template>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .bauhaus-decor {
    display: none !important;
  }
}

@media (max-width: 640px) {
  .bauhaus-decor {
    display: none;
  }
}
</style>
