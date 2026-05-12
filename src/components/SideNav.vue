<script setup lang="ts">
import { useRouter, RouterLink, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const handleLogout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  router.push('/');
};
</script>

<template>
  <aside class="h-screen w-64 fixed left-0 top-0 bg-white border-r border-[#e0e4df] shadow-sm z-50 overflow-y-auto hidden md:block">
    <div class="flex flex-col h-full py-8">
      <div class="mb-10 px-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-[#387b41]/10 rounded-lg flex items-center justify-center">
            <span class="material-symbols-outlined text-[#387b41]">domain</span>
          </div>
          <div>
            <h1 class="text-lg font-bold text-[#387b41] leading-tight">Lost & Found</h1>
            <p class="text-[10px] text-[#40493d] font-medium uppercase tracking-wider">Digital Concierge</p>
          </div>
        </div>
      </div>
      
      <nav class="flex-1 px-3 space-y-1">
        <RouterLink to="/dashboard" 
          :class="['flex items-center gap-3 px-4 py-3 transition-all duration-200',
            route.path === '/dashboard' 
              ? 'text-[#387b41] font-bold bg-[#eef5ee] border-r-4 border-[#387b41]'
              : 'text-[#40493d] hover:text-[#387b41] hover:bg-[#f3f7f3]']">
          <span class="material-symbols-outlined">dashboard</span>
          <span class="text-sm">Dashboard</span>
        </RouterLink>
        <RouterLink to="/my-reports" 
          :class="['flex items-center gap-3 px-4 py-3 transition-all duration-200',
            route.path === '/my-reports'
              ? 'text-[#387b41] font-bold bg-[#eef5ee] border-r-4 border-[#387b41]'
              : 'text-[#40493d] hover:text-[#387b41] hover:bg-[#f3f7f3]']">
          <span class="material-symbols-outlined">inventory</span>
          <span class="text-sm">My Reports</span>
        </RouterLink>
        <RouterLink to="/report" 
          :class="['flex items-center gap-3 px-4 py-3 transition-all duration-200',
            route.path === '/report'
              ? 'text-[#387b41] font-bold bg-[#eef5ee] border-r-4 border-[#387b41]'
              : 'text-[#40493d] hover:text-[#387b41] hover:bg-[#f3f7f3]']">
          <span class="material-symbols-outlined">report</span>
          <span class="text-sm">Lapor</span>
        </RouterLink>
        <a href="#" class="flex items-center gap-3 px-4 py-3 text-[#40493d] hover:text-[#387b41] hover:bg-[#f3f7f3] transition-colors duration-200">
          <span class="material-symbols-outlined">search</span>
          <span class="text-sm">Pencarian</span>
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 text-[#40493d] hover:text-[#387b41] hover:bg-[#f3f7f3] transition-colors duration-200">
          <span class="material-symbols-outlined">leaderboard</span>
          <span class="text-sm">Statistik</span>
        </a>
      </nav>
      
      <div class="px-4 space-y-3 mt-auto">
        <RouterLink to="/report" class="w-full py-3 px-4 bg-[#0d631b] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#0a4d15] transition-all shadow-sm active:scale-95">
          <span class="material-symbols-outlined text-[20px]">add</span>
          <span class="text-xs">Report Found Item</span>
        </RouterLink>
        <button @click="handleLogout" class="w-full py-3 px-4 bg-[#fef2f2] text-[#ba1a1a] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#fde8e8] transition-all active:scale-95">
          <span class="material-symbols-outlined text-[20px]">logout</span>
          <span class="text-xs">Logout</span>
        </button>
      </div>
    </div>
  </aside>
</template>
