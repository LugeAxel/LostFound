<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex font-sans pb-20">
    <SideNav />
    <TopNav />
    <main class="md:ml-64 pt-24 px-8 pb-12 w-full max-w-[1200px] mx-auto flex flex-col min-h-screen">
      <div class="flex-grow">
        <button @click="router.back()" class="flex items-center gap-2 text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] mb-8 transition-colors font-bold text-sm group">
          <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          {{ t('developer.back') }}
        </button>

        <div class="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] shadow-xl p-4 md:p-8 md:p-12 border border-[#e0e4df] dark:border-[#374151] relative overflow-hidden mb-12">
          <div class="absolute -top-20 -right-20 w-40 h-40 bg-[#387b41] opacity-5 rounded-full"></div>
          
          <h1 class="text-4xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-4 tracking-tight">{{ t('developer.title') }}</h1>
          <p class="text-[#40493d] dark:text-[#9ca3af] mb-12 text-base md:text-lg font-medium max-w-2xl">{{ t('developer.subtitle') }}</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 relative z-10">
            <div v-for="dev in developers" :key="dev.name" class="bg-[#f8faf7] dark:bg-[#121212] rounded-[2rem] p-4 md:p-6 shadow-sm border border-[#e0e4df] dark:border-[#374151] text-center hover:shadow-md transition-all group">
              <div class="w-32 h-32 mx-auto rounded-full bg-gray-200 mb-6 overflow-hidden border-4 border-white shadow-sm group-hover:scale-105 transition-transform duration-300">
                <img :src="dev.photo" alt="Developer photo" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
              </div>
              <h3 class="font-bold text-base md:text-lg md:text-xl text-[#1c1b1b] dark:text-[#f3f4f6] mb-1">{{ dev.displayName }}</h3>
              <p class="text-[#387b41] text-sm font-bold uppercase tracking-wider mb-4">{{ dev.roleKey }}</p>
              <p class="text-xs text-[#40493d] dark:text-[#9ca3af]">{{ dev.descKey }}</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue';
import { useRouter } from 'vue-router';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import Footer from '../components/Footer.vue';
import { useI18n } from '../i18n';

const router = useRouter();
const { t } = useI18n();
useHead({ title: () => `${t('developer.title')} — QReturn` });

const developers = [
  { name: 'dev1', displayName: t('developer.dev1_name'), roleKey: t('developer.dev1_role'), descKey: t('developer.dev1_desc'), photo: 'https://res.cloudinary.com/djtwl4a6s/image/upload/q_auto/f_auto/v1779162940/f4a01707-0b70-4ec3-95c8-bfc0d12ad8e3_c6grno.jpg' },
  { name: 'dev2', displayName: t('developer.dev2_name'), roleKey: t('developer.dev2_role'), descKey: t('developer.dev2_desc'), photo: 'https://res.cloudinary.com/djtwl4a6s/image/upload/q_auto/f_auto/v1778853941/WhatsApp_Image_2026-05-15_at_9.05.12_PM_kgav1e.jpg' },
  { name: 'dev3', displayName: t('developer.dev3_name'), roleKey: t('developer.dev3_role'), descKey: t('developer.dev3_desc'), photo: 'https://res.cloudinary.com/djtwl4a6s/image/upload/q_auto/f_auto/v1779163827/4afefefe-12be-48f9-b4f3-545c3db160de_bgsfac.jpg' },
  { name: 'dev4', displayName: t('developer.dev4_name'), roleKey: t('developer.dev4_role'), descKey: t('developer.dev4_desc'), photo: 'https://res.cloudinary.com/djtwl4a6s/image/upload/q_auto/f_auto/v1779162780/WhatsApp_Image_2026-05-19_at_10.51.49_AM_ytdsax.jpg' },
];
</script>
