<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { RouterLink, useRouter } from 'vue-router';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import ItemCard from '../components/ItemCard.vue';
import Footer from '../components/Footer.vue';
import OnboardingOverlay from '../components/OnboardingOverlay.vue';
import { API_URL } from '@/config/api';
import { useI18n } from '../i18n';
import { getAuthHeaders } from '../composables/useAuth';
import { supabase } from '../lib/supabase';

const router = useRouter();
const { t } = useI18n();
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'));
const items = ref<any[]>([]);
const stats = ref({ currentlyLost: 0, foundToday: 0, returnedAllTime: 0 });
const recommendations = ref<any[]>([]);
const showOnboarding = ref(
  !localStorage.getItem('onboarding_seen') ||
  new URLSearchParams(window.location.search).has('onboarding')
);

const fetchStats = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/stats`, { headers: await getAuthHeaders() });
    stats.value = res.data;
  } catch (error: any) {
    if (error.response?.status === 401) { await supabase.auth.signOut(); localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/'); }
    console.error('Error fetching stats:', error);
  }
};

const fetchItems = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/items?limit=6`, { headers: await getAuthHeaders() });
    items.value = res.data.items || [];
  } catch (error: any) {
    if (error.response?.status === 401) { await supabase.auth.signOut(); localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/'); }
    console.error('Error fetching items:', error);
  }
};

const fetchRecommendations = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/items/recommendations`, { headers: await getAuthHeaders() });
    recommendations.value = res.data || [];
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
  }
};

onMounted(() => { fetchStats(); fetchItems(); fetchRecommendations(); });
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex ">
    <OnboardingOverlay v-if="showOnboarding" @close="showOnboarding = false" />
    <SideNav />
    <TopNav />

    <!-- Main Content -->
    <main class="md:ml-64 pt-24 px-4 sm:px-6 md:px-8 pb-20 min-h-screen w-full max-w-[1200px] mx-auto">
      <!-- Welcome Banner -->
      <section class="mb-10">
        <div class="relative overflow-hidden rounded-[2rem] bg-[#387b41] p-10 text-white flex justify-between items-center shadow-lg">
          <div class="relative z-10 max-w-xl">
            <div
              class="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
              <span class="material-symbols-outlined text-sm">school</span> SMKN 2 Depok
            </div>
            <h2 class="text-4xl font-bold mb-4 tracking-tight">{{ t('dash.welcome') }} {{ user.nama ? user.nama.split(' ')[0] : 'Student' }}!</h2>
            <p class="text-lg opacity-90 mb-8 leading-relaxed">{{ t('dash.welcome_sub') }}</p>
            <div class="flex gap-4">
              <RouterLink to="/my-reports" class="px-6 py-3 bg-white dark:bg-[#1e1e1e] text-[#387b41] rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-md">{{ t('dash.view_my_items') }}</RouterLink>
              <RouterLink to="/tutorial" class="px-6 py-3 bg-transparent border border-white/40 text-white rounded-xl font-bold hover:bg-white/10 transition-all">{{ t('dash.how_it_works') }}</RouterLink>
            </div>
          </div>
          <div class="absolute right-10 top-1/2 -translate-y-1/2 h-4/5 w-1/4 opacity-20 flex items-center justify-center pointer-events-none">
            <span class="material-symbols-outlined text-[180px] scale-650">inventory_2</span>
          </div>
        </div>
      </section>

      <!-- Stats Grid -->
      <section class="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-10">
        <div class="bg-white dark:bg-[#1e1e1e] p-3 md:p-6 rounded-2xl border border-[#e0e4df] dark:border-[#374151] shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5">
          <div class="w-14 h-14 rounded-full bg-[#fef2f2] flex items-center justify-center text-[#ef4444]">
            <span class="material-symbols-outlined text-2xl">search</span>
          </div>
          <div>
            <p class="text-xs text-[#40493d] dark:text-[#9ca3af] font-bold uppercase tracking-wider">{{ t('dash.currently_lost') }}</p>
            <h3 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ stats.currentlyLost.toLocaleString() }} {{ t('dash.items') }}</h3>
          </div>
        </div>
        <div class="bg-white dark:bg-[#1e1e1e] p-3 md:p-6 rounded-2xl border border-[#e0e4df] dark:border-[#374151] shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5">
          <div class="w-14 h-14 rounded-full bg-[#f0fdf4] flex items-center justify-center text-[#22c55e]">
            <span class="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div>
            <p class="text-xs text-[#40493d] dark:text-[#9ca3af] font-bold uppercase tracking-wider">{{ t('dash.found_today') }}</p>
            <h3 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ stats.foundToday.toLocaleString() }} {{ t('dash.items') }}</h3>
          </div>
        </div>
        <div class="col-span-2 lg:col-span-1 bg-white dark:bg-[#1e1e1e] p-3 md:p-6 rounded-2xl border border-[#e0e4df] dark:border-[#374151] shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5">
          <div class="w-14 h-14 rounded-full bg-[#f0f9ff] flex items-center justify-center text-[#0ea5e9]">
            <span class="material-symbols-outlined text-2xl">handshake</span>
          </div>
          <div>
            <p class="text-xs text-[#40493d] dark:text-[#9ca3af] font-bold uppercase tracking-wider">{{ t('dash.returned_all_time') }}</p>
            <h3 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ stats.returnedAllTime.toLocaleString() }} {{ t('dash.items') }}</h3>
          </div>
        </div>
      </section>

        <!-- Quick Actions -->
      <section class="mb-10">
        <h3 class="text-lg font-bold mb-4 sm:mb-6 dark:text-[#88d982] text-[#387b41] flex items-center gap-2">
          <span class="material-symbols-outlined text-[#387b41]">bolt</span> {{ t('dash.quick_actions') }}
        </h3>
        <div class="flex overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 gap-3 sm:gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:pb-0 md:mx-0 md:px-0 hide-scrollbar">
          <RouterLink to="/report" class="min-w-[75vw] sm:min-w-[65vw] md:min-w-0 snap-center bg-white dark:bg-[#1e1e1e] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md transition-all group border-l-[4px] border-l-[#1b6d24]">
            <span class="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-[#1b6d24] mb-3 sm:mb-4">find_in_page</span>
            <h4 class="text-base sm:text-lg md:text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1 sm:mb-2">{{ t('dash.report_lost') }}</h4>
            <p class="text-xs sm:text-sm text-[#40493d] dark:text-[#9ca3af] mb-3 sm:mb-4 leading-relaxed line-clamp-2">{{ t('dash.report_lost_desc') }}</p>
            <div class="flex items-center text-[#387b41] font-bold text-xs sm:text-sm gap-1 sm:gap-2">{{ t('dash.start_report') }} <span class="material-symbols-outlined text-sm sm:text-base group-hover:translate-x-1 transition-transform">arrow_forward</span></div>
          </RouterLink>
          <RouterLink to="/report" class="min-w-[75vw] sm:min-w-[65vw] md:min-w-0 snap-center bg-white dark:bg-[#1e1e1e] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md transition-all group border-l-[4px] border-l-[#387b41]">
            <span class="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-[#387b41] mb-3 sm:mb-4">add_a_photo</span>
            <h4 class="text-base sm:text-lg md:text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1 sm:mb-2">{{ t('dash.report_found') }}</h4>
            <p class="text-xs sm:text-sm text-[#40493d] dark:text-[#9ca3af] mb-3 sm:mb-4 leading-relaxed line-clamp-2">{{ t('dash.report_found_desc') }}</p>
            <div class="flex items-center text-[#387b41] font-bold text-xs sm:text-sm gap-1 sm:gap-2">{{ t('dash.log_item') }} <span class="material-symbols-outlined text-sm sm:text-base group-hover:translate-x-1 transition-transform">arrow_forward</span></div>
          </RouterLink>
          <RouterLink to="/scan" class="min-w-[75vw] sm:min-w-[65vw] md:min-w-0 snap-center bg-white dark:bg-[#1e1e1e] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md transition-all group border-l-[4px] border-l-[#387b41]">
            <span class="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-[#387b41] mb-3 sm:mb-4">qr_code_2</span>
            <h4 class="text-base sm:text-lg md:text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1 sm:mb-2">{{ t('dash.scan_to_claim') }}</h4>
            <p class="text-xs sm:text-sm text-[#40493d] dark:text-[#9ca3af] mb-3 sm:mb-4 leading-relaxed line-clamp-2">{{ t('dash.scan_to_claim_desc') }}</p>
            <div class="flex items-center text-[#387b41] font-bold text-xs sm:text-sm gap-1 sm:gap-2">{{ t('dash.open_scanner') }} <span class="material-symbols-outlined text-sm sm:text-base group-hover:translate-x-1 transition-transform">arrow_forward</span></div>
          </RouterLink>
          <RouterLink to="/statistics" class="min-w-[75vw] sm:min-w-[65vw] md:min-w-0 snap-center bg-white dark:bg-[#1e1e1e] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md transition-all group border-l-[4px] border-l-[#8b5cf6]">
            <span class="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-[#8b5cf6] mb-3 sm:mb-4">leaderboard</span>
            <h4 class="text-base sm:text-lg md:text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1 sm:mb-2">{{ t('nav.statistics') }}</h4>
            <p class="text-xs sm:text-sm text-[#40493d] dark:text-[#9ca3af] mb-3 sm:mb-4 leading-relaxed line-clamp-2">{{ t('stats.subtitle') }}</p>
            <div class="flex items-center text-[#8b5cf6] font-bold text-xs sm:text-sm gap-1 sm:gap-2">Explore <span class="material-symbols-outlined text-sm sm:text-base group-hover:translate-x-1 transition-transform">arrow_forward</span></div>
          </RouterLink>
        </div>
      </section>

      <!-- Recommendations -->
      <section class="mb-10">
        <div class="flex justify-between items-end mb-8">
          <div>
            <h3 class="text-lg dark:text-white text-black font-bold flex items-center gap-2">
              <span class="material-symbols-outlined text-[#f57f17]">lightbulb</span>
              {{ t('dash.recommendations') }}
            </h3>
            <p class="text-sm text-[#40493d] dark:text-[#9ca3af]">{{ t('dash.recommendations_sub') }}</p>
          </div>
        </div>
        <div v-if="recommendations.length === 0" class="text-center py-16 bg-white dark:bg-[#1e1e1e] rounded-[2rem] border border-dashed border-[#e0e4df] dark:border-[#374151]">
          <span class="material-symbols-outlined text-5xl text-[#40493d] dark:text-[#9ca3af]/10 mb-3">lightbulb</span>
          <p class="text-[#40493d] dark:text-[#9ca3af] font-medium">{{ t('dash.no_recommendations') }}</p>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          <ItemCard v-for="rec in recommendations" :key="rec.id" :item="rec" />
        </div>
      </section>

      <!-- Recent Items -->
      <section>
        <div class="flex justify-between items-end mb-8">
          <div>
            <h3 class="text-lg dark:text-white text-black font-bold">{{ t('dash.recent_items') }}</h3>
            <p class="text-sm text-[#40493d] dark:text-[#9ca3af]">{{ t('dash.recent_items_sub') }}</p>
          </div>
          <RouterLink to="/search" class="text-sm text-[#387b41] font-bold flex items-center gap-1 hover:underline transition-all">
            {{ t('dash.see_all') }}
            <span class="material-symbols-outlined text-base">arrow_forward</span>
          </RouterLink>
        </div>
        <div v-if="items.length === 0" class="text-center py-20 bg-white dark:bg-[#1e1e1e] rounded-[2rem] border border-dashed border-[#e0e4df] dark:border-[#374151]">
          <span class="material-symbols-outlined text-6xl text-[#40493d] dark:text-[#9ca3af]/10 mb-4">inventory_2</span>
          <p class="text-[#40493d] dark:text-[#9ca3af] font-medium">{{ t('dash.no_items') }}</p>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          <ItemCard v-for="item in items" :key="item.id" :item="item" />
        </div>
      </section>
      
      <Footer />
    </main>
  </div>
</template>
