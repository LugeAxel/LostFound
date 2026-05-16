<script setup lang="ts">
import { useRouter, RouterLink, useRoute } from 'vue-router';
import { useI18n } from '../i18n';
import { supabase } from '../lib/supabase';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const handleLogout = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  router.push('/');
};
</script>

<template>
  <aside class="h-screen w-64 fixed left-0 top-0 bg-white dark:bg-[#1e1e1e] border-r border-[#e0e4df] dark:border-[#374151] shadow-sm z-50 overflow-y-auto hidden md:block">
    <div class="flex flex-col h-full py-8">
      <div class="mb-8 px-6 flex items-center justify-center flex-col">
        <div class="mb-2 p-2 w-15 h-15 bg-[#387b41]/10 rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="" class="w-full h-full object-cover">
          </div>
        <div class="flex items-center gap-2 text-center">
          <div>
            <h1 class="text-lg font-bold text-[#387b41] leading-tight">{{ t('nav.brand') }}</h1>
            <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af] font-medium uppercase tracking-wider">{{ t('nav.brand_sub') }}</p>
          </div>
        </div>
      </div>
      
      <nav class="flex-1 px-3 space-y-1">
        <RouterLink to="/dashboard" 
          :class="['flex items-center gap-3 px-4 py-3 transition-all duration-200',
            route.path === '/dashboard' 
              ? 'text-[#387b41] font-bold bg-[#eef5ee] border-r-4 border-[#387b41]'
              : 'text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] dark:hover:bg-[#00000089] hover:bg-[#f3f7f3]']">
          <span class="material-symbols-outlined">dashboard</span>
          <span class="text-sm">{{ t('nav.dashboard') }}</span>
        </RouterLink>
        <RouterLink to="/my-reports" 
          :class="['flex items-center gap-3 px-4 py-3 transition-all duration-200',
            route.path === '/my-reports'
              ? 'text-[#387b41] font-bold bg-[#eef5ee] border-r-4 border-[#387b41]'
              : 'text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] dark:hover:bg-[#00000089] hover:bg-[#f3f7f3]']">
          <span class="material-symbols-outlined">inventory</span>
          <span class="text-sm">{{ t('nav.my_reports') }}</span>
        </RouterLink>
        <RouterLink to="/report" 
          :class="['flex items-center gap-3 px-4 py-3 transition-all duration-200',
            route.path === '/report'
              ? 'text-[#387b41] font-bold bg-[#eef5ee] border-r-4 border-[#387b41]'
              : 'text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] dark:hover:bg-[#00000089] hover:bg-[#f3f7f3]']">
          <span class="material-symbols-outlined">report</span>
          <span class="text-sm">{{ t('nav.report') }}</span>
        </RouterLink>
        <RouterLink to="/search" 
          :class="['flex items-center gap-3 px-4 py-3 transition-all duration-200',
            route.path === '/search'
              ? 'text-[#387b41] font-bold bg-[#eef5ee] border-r-4 border-[#387b41]'
              : 'text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] dark:hover:bg-[#00000089] hover:bg-[#f3f7f3]']">
          <span class="material-symbols-outlined">search</span>
          <span class="text-sm">{{ t('nav.search') }}</span>
        </RouterLink>
        <RouterLink to="/statistics" 
          :class="['flex items-center gap-3 px-4 py-3 transition-all duration-200',
            route.path === '/statistics'
              ? 'text-[#387b41] font-bold bg-[#eef5ee] border-r-4 border-[#387b41]'
              : 'text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] dark:hover:bg-[#00000089] hover:bg-[#f3f7f3]']">
          <span class="material-symbols-outlined">leaderboard</span>
          <span class="text-sm">{{ t('nav.statistics') }}</span>
        </RouterLink>
        <RouterLink to="/scan" 
          :class="['flex items-center gap-3 mb-8 px-4 py-3 transition-all duration-200',
            route.path === '/scan'
              ? 'text-[#387b41] font-bold bg-[#eef5ee] border-r-4 border-[#387b41]'
              : 'text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] dark:hover:bg-[#00000089] hover:bg-[#f3f7f3]']">
          <span class="material-symbols-outlined">qr_code</span>
          <span class="text-sm">Scan</span>
        </RouterLink>
      </nav>
      
      <div class="px-4 space-y-3 mt-auto">
        <RouterLink to="/report" class="w-full py-3 px-4 bg-[#0d631b] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#0a4d15] transition-all shadow-sm active:scale-95">
          <span class="material-symbols-outlined text-[20px]">add</span>
          <span class="text-xs">{{ t('nav.report_found') }}</span>
        </RouterLink>
        <button @click="handleLogout" class="w-full py-3 px-4 dark:bg-[#1c0101d8] bg-[#ffdcdc] text-[#ba1a1a] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#ff000053] dark:hover:bg-[#3a0a0aff] transition-all active:scale-95">
          <span class="material-symbols-outlined text-[20px]">logout</span>
          <span class="text-xs">{{ t('nav.logout') }}</span>
        </button>
      </div>
    </div>
  </aside>

  <!-- Mobile Bottom Nav -->
  <nav class="md:hidden fixed bottom-0 left-0 w-full bg-white/90 bg-white dark:bg-[#1e1e1e] backdrop-blur-xl border-t border-[#e0e4df] dark:border-[#374151] z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] flex justify-around items-center h-[72px] pb-2 px-2">
    <RouterLink to="/dashboard" :class="['flex flex-col items-center p-2 active:scale-90 transition-all duration-150', route.path === '/dashboard' ? 'text-[#387b41] dark:text-[#88d982] font-bold' : 'text-[#40493d] dark:text-[#9ca3af] dark:text-gray-400 opacity-80']">
      <span class="material-symbols-outlined" :style="route.path === '/dashboard' ? 'font-variation-settings: \'FILL\' 1;' : ''">dashboard</span>
      <span class="text-[10px] mt-1 w-20 truncate text-center">{{ t('nav.dashboard') }}</span>
    </RouterLink>
    
    <RouterLink to="/my-reports" :class="['flex flex-col items-center p-2 active:scale-90 transition-all duration-150', route.path === '/my-reports' ? 'text-[#387b41] dark:text-[#88d982] font-bold' : 'text-[#40493d] dark:text-[#9ca3af] dark:text-gray-400 opacity-80']">
      <span class="material-symbols-outlined" :style="route.path === '/my-reports' ? 'font-variation-settings: \'FILL\' 1;' : ''">inventory</span>
      <span class="text-[10px] mt-1 w-20 truncate text-center">{{ t('nav.my_reports') }}</span>
    </RouterLink>
    
 
    
    <RouterLink to="/report" class="flex flex-col items-center p-2 text-white active:scale-95 transition-all duration-150 relative -top-5">
      <div class="w-14 h-14 bg-[#0d631b] dark:bg-[#88d982] rounded-full flex items-center justify-center shadow-lg shadow-[#0d631b]/30 dark:shadow-[#88d982]/20 border-4 border-[#fcf9f8] dark:border-[#131313]">
        <span class="material-symbols-outlined text-base md:text-lg md:text-xl md:text-2xl md:text-3xl dark:text-[#002204]">add</span>
      </div>
    </RouterLink>
       
    <RouterLink to="/scan" :class="['flex flex-col items-center p-2 active:scale-90 transition-all duration-150', route.path === '/scan' ? 'text-[#387b41] dark:text-[#88d982] font-bold' : 'text-[#40493d] dark:text-[#9ca3af] dark:text-gray-400 opacity-80']">
      <span class="material-symbols-outlined" :style="route.path === '/scan' ? 'font-variation-settings: \'FILL\' 1;' : ''">qr_code_scanner</span>
      <span class="text-[10px] mt-1 w-20 truncate text-center">Scan</span>
    </RouterLink>

    <button @click="handleLogout" class="flex flex-col items-center p-2 text-[#40493d] dark:text-[#9ca3af] dark:text-gray-400 opacity-80 active:scale-90 transition-all duration-150 hover:text-[#ba1a1a] dark:hover:text-[#ffb4ab]">
      <span class="material-symbols-outlined">logout</span>
      <span class="text-[10px] mt-1 w-20 truncate text-center">{{ t('nav.logout') }}</span>
    </button>
  </nav>
</template>
