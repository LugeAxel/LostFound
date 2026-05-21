<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { useRouter } from 'vue-router';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import { useI18n } from '../i18n';

const router = useRouter();
const { t } = useI18n();
useHead({ title: () => `${t('tutorial.title')} — QReturn` });

const claimSteps = [
  { icon: 'dashboard', color: '#387b41', key: 'claim_step1' },
  { icon: 'touch_app', color: '#0ea5e9', key: 'claim_step2' },
  { icon: 'chat', color: '#f59e0b', key: 'claim_step3' },
  { icon: 'qr_code_scanner', color: '#8b5cf6', key: 'claim_step4' },
  { icon: 'photo_camera', color: '#ef4444', key: 'claim_step5' },
  { icon: 'check_circle', color: '#22c55e', key: 'claim_step6' },
];

const reportSteps = [
  { icon: 'description', color: '#387b41', key: 'report_step1' },
  { icon: 'swap_horiz', color: '#0ea5e9', key: 'report_step2' },
  { icon: 'photo_camera', color: '#f59e0b', key: 'report_step3' },
  { icon: 'edit_note', color: '#8b5cf6', key: 'report_step4' },
  { icon: 'send', color: '#22c55e', key: 'report_step5' },
];

const smartSteps = [
  { icon: 'search', color: '#387b41', key: 'smart_step1' },
  { icon: 'psychology', color: '#8b5cf6', key: 'smart_step2' },
  { icon: 'emoji_objects', color: '#f59e0b', key: 'smart_step3' },
];

const tips = ['tip1', 'tip2', 'tip3', 'tip4', 'tip5'];
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex">
    <SideNav />
    <TopNav />

    <main class="md:ml-64 pt-24 px-8 pb-12 min-h-screen flex-1 min-w-0">
      <!-- Back Button -->
      <button @click="router.push('/dashboard')"
        class="flex items-center gap-2 text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] mb-8 transition-colors font-bold text-sm group">
        <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        {{ t('tutorial.back') }}
      </button>

      <!-- Hero Header -->
      <section class="mb-12">
        <div
          class="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#387b41] to-[#1b5e20] p-10 text-white shadow-lg">
          <div class="relative z-10 max-w-2xl">
            <div
              class="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
              <span class="material-symbols-outlined text-sm">school</span> SMKN 2 Depok
            </div>
            <h1 class="text-4xl font-bold mb-3 tracking-tight">{{ t('tutorial.title') }}</h1>
            <p class="text-lg opacity-90 leading-relaxed">{{ t('tutorial.subtitle') }}</p>
          </div>
          <div
            class="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden md:flex items-center justify-center">
            <span class="material-symbols-outlined text-[200px]">help</span>
          </div>
        </div>
      </section>

      <!-- ===== Section 1: How to Claim ===== -->
      <section class="mb-16">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-[#f0fdf4] flex items-center justify-center">
            <span class="material-symbols-outlined text-[#22c55e]">verified</span>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] tracking-tight">{{ t('tutorial.claim_title') }}</h2>
            <p class="text-sm text-[#40493d] dark:text-[#9ca3af]">{{ t('tutorial.claim_subtitle') }}</p>
          </div>
        </div>

        <div class="mt-8 relative">
          <div class="space-y-6 z-10">
            <div v-for="(step, index) in claimSteps" :key="step.key"
              class="relative flex gap-4 md:gap-6 items-start group ">
              <!-- Step number circle -->
              <div class="relative z-10 shrink-0">
                <div
                  class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                  :style="{ backgroundColor: step.color + '15', color: step.color }">
                  <span class="material-symbols-outlined text-2xl">{{ step.icon }}</span>
                </div>
              </div>
              <!-- Content Card -->
              <div
                class="flex-1 bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm group-hover:shadow-md group-hover:border-[#387b41]/20 transition-all z-10">
                <div class="flex items-center gap-3 mb-2">
                  <span
                    class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white z-50"
                    :style="{ backgroundColor: step.color }">{{ index + 1 }}</span>
                  <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t(`tutorial.${step.key}_title`) }}</h3>
                </div>
                <p class="text-sm text-[#40493d] dark:text-[#9ca3af] leading-relaxed pl-10">{{ t(`tutorial.${step.key}_desc`) }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Section 2: How to Report ===== -->
      <section class="mb-16">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center">
            <span class="material-symbols-outlined text-[#ef4444]">edit_document</span>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] tracking-tight">{{ t('tutorial.report_title') }}</h2>
            <p class="text-sm text-[#40493d] dark:text-[#9ca3af]">{{ t('tutorial.report_subtitle') }}</p>
          </div>
        </div>

        <div class="mt-8 relative">
          <!-- Vertical timeline line -->

          <div class="space-y-6 z-10">
            <div v-for="(step, index) in reportSteps" :key="step.key"
              class="relative flex gap-4 md:gap-6 items-start group">
              <!-- Step number circle -->
              <div class="relative z-10 shrink-0">
                <div
                  class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                  :style="{ backgroundColor: step.color + '15', color: step.color }">
                  <span class="material-symbols-outlined text-2xl">{{ step.icon }}</span>
                </div>
              </div>
              <!-- Content Card -->
              <div
                class="flex-1 bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm group-hover:shadow-md group-hover:border-[#387b41]/20 transition-all z-10">
                <div class="flex items-center gap-3 mb-2">
                  <span
                    class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white z-50"
                    :style="{ backgroundColor: step.color }">{{ index + 1 }}</span>
                  <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t(`tutorial.${step.key}_title`) }}</h3>
                </div>
                <p class="text-sm text-[#40493d] dark:text-[#9ca3af] leading-relaxed pl-10">{{ t(`tutorial.${step.key}_desc`) }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Section 3: Smart Item Matching ===== -->
      <section class="mb-16">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-[#f3e8ff] dark:bg-[#2e1065] flex items-center justify-center">
            <span class="material-symbols-outlined text-[#8b5cf6]">psychology</span>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] tracking-tight">{{ t('tutorial.smart_title') }}</h2>
            <p class="text-sm text-[#40493d] dark:text-[#9ca3af]">{{ t('tutorial.smart_subtitle') }}</p>
          </div>
        </div>

        <div class="mt-8 relative">
          <div class="space-y-6 z-10">
            <div v-for="(step, index) in smartSteps" :key="step.key"
              class="relative flex gap-4 md:gap-6 items-start group">
              <div class="relative z-10 shrink-0">
                <div
                  class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                  :style="{ backgroundColor: step.color + '15', color: step.color }">
                  <span class="material-symbols-outlined text-2xl">{{ step.icon }}</span>
                </div>
              </div>
              <div
                class="flex-1 bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm group-hover:shadow-md group-hover:border-[#8b5cf6]/20 transition-all z-10">
                <div class="flex items-center gap-3 mb-2">
                  <span
                    class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white"
                    :style="{ backgroundColor: step.color }">{{ index + 1 }}</span>
                  <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t(`tutorial.${step.key}_title`) }}</h3>
                </div>
                <p class="text-sm text-[#40493d] dark:text-[#9ca3af] leading-relaxed pl-10">{{ t(`tutorial.${step.key}_desc`) }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Tips Section ===== -->
      <section class="mb-12">
        <div
          class="bg-gradient-to-br from-[#fffbeb] to-[#fef3c7] rounded-[2rem] p-4 md:p-8 border border-[#fde68a]/40 shadow-sm">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-[#f59e0b]/15 flex items-center justify-center">
              <span class="material-symbols-outlined text-[#f59e0b]">lightbulb</span>
            </div>
            <h2 class="text-xl font-bold text-[#92400e]">{{ t('tutorial.tip_title') }}</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="tip in tips" :key="tip"
              class="flex items-start gap-3 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-[#fde68a]/30">
              <span
                class="material-symbols-outlined text-[#f59e0b] mt-0.5 shrink-0">tips_and_updates</span>
              <p class="text-sm text-[#78350f] font-medium leading-relaxed">{{ t(`tutorial.${tip}`) }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="text-center mb-8">
        <div class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] p-10 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
          <span class="material-symbols-outlined text-5xl text-[#22c55e]/100 mb-4">rocket_launch</span>
          <h3 class="text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2">
            {{ t('tutorial.cta_title') }}
          </h3>
          <p class="text-sm text-[#40493d] dark:text-[#9ca3af] mb-6">
            {{ t('tutorial.cta_desc') }}
          </p>
          <div class="flex justify-center gap-4 flex-wrap">
            <router-link to="/dashboard"
              class="px-6 py-3 bg-[#387b41] text-white rounded-xl font-bold hover:bg-[#2d6334] transition-all shadow-md">
              {{ t('nav.dashboard') }}
            </router-link>
            <router-link to="/report"
              class="px-6 py-3 bg-white dark:bg-[#1e1e1e] border-2 border-[#387b41] text-[#387b41] rounded-xl font-bold hover:bg-[#f0fdf4] transition-all">
              {{ t('nav.report') }}
            </router-link>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
