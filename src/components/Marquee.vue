<script setup lang="ts">
import { useI18n } from '../i18n';
const { t } = useI18n();
</script>

<template>
  <div class="bg-[#387b41] dark:bg-[#1b4321] text-white py-2 overflow-hidden whitespace-nowrap relative z-10 border-b border-white/10 shadow-inner">
    <div class="flex items-center gap-4 animate-marquee p-2">
      <div v-for="i in 10" :key="i" class="flex items-center gap-4 px-4">
        <span class="material-symbols-outlined text-sm">info</span>
        <span class="text-[10px] font-bold tracking-wider uppercase">
          {{ t('marquee.retention_policy') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-marquee {
  display: inline-flex;
  animation: marquee 40s linear infinite;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* Pause on hover to allow reading */
.animate-marquee:hover {
  animation-play-state: paused;
}
</style>
