<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useHead } from '@unhead/vue';
import axios from 'axios';
import { RouterLink, useRouter } from 'vue-router';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import ItemCard from '../components/ItemCard.vue';
import ItemSkeleton from '../components/ItemSkeleton.vue';
import Footer from '../components/Footer.vue';
import OnboardingOverlay from '../components/OnboardingOverlay.vue';
import { API_URL } from '@/config/api';
import { useI18n } from '../i18n';
import { getAuthHeaders } from '../composables/useAuth';
import { supabase } from '../lib/supabase';
import { useRealtimeAllItems } from '../composables/useRealtimeAllItems';

const router = useRouter();

const bannerShapes = [
  { id: 1, type: 'dot', size: 200, top: '-60px', right: '-40px', opacity: 0.25, class: 'animate-bauhaus-pulse' },
  { id: 2, type: 'square', size: 80, bottom: '-20px', left: '30px', opacity: 0.3, class: 'animate-bauhaus-spin-slow' },
  { id: 3, type: 'dot', size: 60, top: '20px', left: '15%', opacity: 0.2, class: 'animate-bauhaus-float-med' },
  { id: 4, type: 'line', width: 120, height: 2, bottom: '40px', right: '20%', opacity: 0.35, class: '' },
];

const statIconColors = [
  { bg: 'bg-[#fef2f2]', icon: 'text-[#ef4444]' },
  { bg: 'bg-[#f0fdf4]', icon: 'text-[#22c55e]' },
  { bg: 'bg-[#f0f9ff]', icon: 'text-[#0ea5e9]' },
];
const { t } = useI18n();
useHead({ title: () => `${t('nav.dashboard')} — QReturn` });
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'));
const loadingUser = ref(true);
const loadingItems = ref(true);
const loadingRecs = ref(true);
const items = ref<any[]>([]);
const stats = ref({ currentlyLost: 0, foundToday: 0, returnedAllTime: 0 });
const recommendations = ref<any[]>([]);
const recsOffset = ref(0);
const visibleRecs = computed(() => recommendations.value.slice(recsOffset.value, recsOffset.value + 6));

function prevRecs() { if (recsOffset.value > 0) recsOffset.value -= 6; }
function nextRecs() { if (recsOffset.value + 6 < recommendations.value.length) recsOffset.value += 6; }

const quickActionsScroll = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const activeQuickActionIndex = ref(0);
const totalQuickActions = 5;

const updateQuickActionsScrollState = () => {
  if (!quickActionsScroll.value) return;
  const el = quickActionsScroll.value;
  canScrollLeft.value = el.scrollLeft > 10;
  canScrollRight.value = el.scrollLeft < (el.scrollWidth - el.clientWidth - 10);
  
  const cardWidth = el.firstElementChild?.clientWidth || 280;
  activeQuickActionIndex.value = Math.round(el.scrollLeft / cardWidth);
};

const scrollQuickActionsLeft = () => {
  if (!quickActionsScroll.value) return;
  const cardWidth = quickActionsScroll.value.firstElementChild?.clientWidth || 280;
  quickActionsScroll.value.scrollBy({ left: -cardWidth, behavior: 'smooth' });
};

const scrollQuickActionsRight = () => {
  if (!quickActionsScroll.value) return;
  const cardWidth = quickActionsScroll.value.firstElementChild?.clientWidth || 280;
  quickActionsScroll.value.scrollBy({ left: cardWidth, behavior: 'smooth' });
};

const scrollToQuickAction = (index: number) => {
  if (!quickActionsScroll.value) return;
  const cardWidth = quickActionsScroll.value.firstElementChild?.clientWidth || 280;
  quickActionsScroll.value.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
};

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
  } finally {
    loadingItems.value = false;
  }
};

const fetchRecommendations = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/items/recommendations`, { headers: await getAuthHeaders() });
    recommendations.value = res.data || [];
    recsOffset.value = 0;
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
  } finally {
    loadingRecs.value = false;
  }
};

const { subscribe: subscribeToAllItems } = useRealtimeAllItems(() => {
  fetchStats();
  fetchItems();
  fetchRecommendations();
}, 1000);

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.data.success) {
        user.value = res.data.user;
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      loadingUser.value = false;
    }
  } else {
    loadingUser.value = false;
  }
  fetchStats(); fetchItems(); fetchRecommendations();
  subscribeToAllItems();
  
  nextTick(() => {
    updateQuickActionsScrollState();
  });
});
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex ">

    <OnboardingOverlay v-if="showOnboarding" @close="showOnboarding = false" />
    <SideNav />
    <TopNav />

    <!-- Main Content -->
    <main class="md:ml-64 pt-24 px-4 sm:px-6 md:px-8 pb-20 min-h-screen flex-1 min-w-0">
      <!-- Welcome Banner (with Bauhaus decor) -->
       <section class="mb-10">
         <div class="relative overflow-hidden rounded-[2rem] bg-[#387b41] p-10 text-white flex justify-between items-center shadow-lg">
           <!-- Bauhaus decorative shapes -->
           <div class="bauhaus-decor bauhaus-decor-mobile-hidden absolute inset-0 pointer-events-none">
             <div v-for="shape in bannerShapes" :key="shape.id"
               :class="[shape.class, 'absolute', shape.type === 'dot' ? 'rounded-full' : '']"
               :style="{
                 width: (shape.width || shape.size) + 'px',
                 height: (shape.height || shape.size) + 'px',
                 top: shape.top,
                 left: shape.left,
                 right: shape.right,
                 bottom: shape.bottom,
                 background: 'white',
                 opacity: shape.opacity
               }">
             </div>
           </div>

           <div class="relative z-10 max-w-xl">
             <div
               class="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
               <span class="material-symbols-outlined text-sm">school</span> SMKN 2 Depok
             </div>
             <h2 class="text-4xl font-bold mb-4 tracking-tight">{{ t('dash.welcome') }} <span v-if="loadingUser" class="inline-block w-24 h-8 bg-white/20 rounded animate-pulse"></span><template v-else>{{ user.nama ? user.nama.split(' ')[0] : 'Student' }}</template>!</h2>
             <p class="text-lg opacity-90 mb-8 leading-relaxed">{{ t('dash.welcome_sub') }}</p>
             <div class="flex gap-4">
               <RouterLink to="/my-reports" class="px-6 py-3 bg-white dark:bg-[#1e1e1e] text-[#387b41] rounded-xl font-bold hover:bg-opacity-90 hover:scale-105 active:scale-[0.97] transition-all shadow-md">{{ t('dash.view_my_items') }}</RouterLink>
               <RouterLink to="/tutorial" class="px-6 py-3 bg-transparent border border-white/40 text-white rounded-xl font-bold hover:bg-white/10 hover:border-white/60 active:scale-[0.97] transition-all">{{ t('dash.how_it_works') }}</RouterLink>
             </div>
           </div>
           <div class="absolute right-10 top-1/2 -translate-y-1/2 h-4/5 w-1/4 opacity-20 flex items-center justify-center pointer-events-none">
             <span class="material-symbols-outlined text-[180px] scale-650">inventory_2</span>
           </div>
         </div>
       </section>

      <!-- Stats Grid (Bauhaus hover enhancements) -->
       <section class="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-10">
         <div class="bg-white dark:bg-[#1e1e1e] p-3 md:p-6 rounded-2xl border border-[#e0e4df] dark:border-[#374151] shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 transition-all duration-300 hover:shadow-md hover:border-[#387b41]/30 dark:hover:border-[#88d982]/30 group overflow-hidden relative">
           <!-- Left accent line -->
           <div class="absolute left-0 top-0 w-0 h-full bg-[#ef4444] opacity-10 group-hover:w-1 transition-all duration-300"></div>
           <div class="w-14 h-14 rounded-full bg-[#fef2f2] flex items-center justify-center text-[#ef4444] transition-transform duration-300 group-hover:scale-105">
             <span class="material-symbols-outlined text-2xl">search</span>
           </div>
           <div>
             <p class="text-xs text-[#40493d] dark:text-[#9ca3af] font-bold uppercase tracking-wider">{{ t('dash.currently_lost') }}</p>
             <h3 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ stats.currentlyLost.toLocaleString() }} {{ t('dash.items') }}</h3>
           </div>
         </div>
         <div class="bg-white dark:bg-[#1e1e1e] p-3 md:p-6 rounded-2xl border border-[#e0e4df] dark:border-[#374151] shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 transition-all duration-300 hover:shadow-md hover:border-[#387b41]/30 dark:hover:border-[#88d982]/30 group overflow-hidden relative">
           <div class="absolute left-0 top-0 w-0 h-full bg-[#22c55e] opacity-10 group-hover:w-1 transition-all duration-300"></div>
           <div class="w-14 h-14 rounded-full bg-[#f0fdf4] flex items-center justify-center text-[#22c55e] transition-transform duration-300 group-hover:scale-105">
             <span class="material-symbols-outlined text-2xl">check_circle</span>
           </div>
           <div>
             <p class="text-xs text-[#40493d] dark:text-[#9ca3af] font-bold uppercase tracking-wider">{{ t('dash.found_today') }}</p>
             <h3 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ stats.foundToday.toLocaleString() }} {{ t('dash.items') }}</h3>
           </div>
         </div>
         <div class="col-span-2 lg:col-span-1 bg-white dark:bg-[#1e1e1e] p-3 md:p-6 rounded-2xl border border-[#e0e4df] dark:border-[#374151] shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 transition-all duration-300 hover:shadow-md hover:border-[#387b41]/30 dark:hover:border-[#88d982]/30 group overflow-hidden relative">
           <div class="absolute left-0 top-0 w-0 h-full bg-[#0ea5e9] opacity-10 group-hover:w-1 transition-all duration-300"></div>
           <div class="w-14 h-14 rounded-full bg-[#f0f9ff] flex items-center justify-center text-[#0ea5e9] transition-transform duration-300 group-hover:scale-105">
             <span class="material-symbols-outlined text-2xl">handshake</span>
           </div>
           <div>
             <p class="text-xs text-[#40493d] dark:text-[#9ca3af] font-bold uppercase tracking-wider">{{ t('dash.returned_all_time') }}</p>
             <h3 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ stats.returnedAllTime.toLocaleString() }} {{ t('dash.items') }}</h3>
           </div>
         </div>
       </section>

         <!-- Quick Actions (Bauhaus enhanced - horizontal scroll with controls) -->
       <section class="mb-10 relative">
         <h3 class="text-lg font-bold mb-4 sm:mb-6 dark:text-[#88d982] text-[#387b41] flex items-center gap-2">
           <span class="material-symbols-outlined text-[#387b41]">bolt</span> {{ t('dash.quick_actions') }}
         </h3>
         
         <!-- LEFT ARROW BUTTON -->
         <button 
           v-if="canScrollLeft"
           @click="scrollQuickActionsLeft"
           class="absolute left-2 sm:left-4 md:left-0 top-1/2 -translate-y-6 z-20 w-10 h-10 rounded-xl
                  bg-white dark:bg-[#1e1e1e] shadow-lg border border-[#e0e4df] dark:border-[#374151]
                  flex items-center justify-center hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] transition-all
                  active:scale-95"
         >
           <span class="material-symbols-outlined text-[#387b41] dark:text-[#88d982]">chevron_left</span>
         </button>
         
         <!-- RIGHT ARROW BUTTON -->
         <button 
           v-if="canScrollRight"
           @click="scrollQuickActionsRight"
           class="absolute right-2 sm:right-4 md:right-0 top-1/2 -translate-y-6 z-20 w-10 h-10 rounded-xl
                  bg-white dark:bg-[#1e1e1e] shadow-lg border border-[#e0e4df] dark:border-[#374151]
                  flex items-center justify-center hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] transition-all
                  active:scale-95"
         >
           <span class="material-symbols-outlined text-[#387b41] dark:text-[#88d982]">chevron_right</span>
         </button>

         <!-- SCROLL CONTAINER (with bleed pattern) -->
         <div 
           ref="quickActionsScroll"
           @scroll="updateQuickActionsScrollState"
           class="flex overflow-x-auto snap-x snap-mandatory pb-6 -mx-4 px-4 sm:px-6 md:px-8
                  gap-3 sm:gap-4 md:gap-5 hide-scrollbar"
         >
           <RouterLink to="/tutorial" class="min-w-[75vw] sm:min-w-[65vw] md:min-w-[260px] snap-center bg-white dark:bg-[#1e1e1e] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md hover:border-[#1b6d24]/60 transition-all duration-300 group border-l-[4px] border-l-[#1b6d24] active:scale-[0.98]">
             <span class="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-[#1b6d24] mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110">help</span>
             <h4 class="text-base sm:text-lg md:text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1 sm:mb-2 transition-colors group-hover:text-[#1b6d24] dark:group-hover:text-[#88d982]">{{ t('dash.tutorial') }}</h4>
             <p class="text-xs sm:text-sm text-[#40493d] dark:text-[#9ca3af] mb-3 sm:mb-4 leading-relaxed line-clamp-2">{{ t('dash.tutorial_desc') }}</p>
             <div class="flex items-center text-[#387b41] font-bold text-xs sm:text-sm gap-1 sm:gap-2">{{ t('dash.start_report') }} <span class="material-symbols-outlined text-sm sm:text-base group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span></div>
           </RouterLink>
           <RouterLink to="/report" class="min-w-[75vw] sm:min-w-[65vw] md:min-w-[260px] snap-center bg-white dark:bg-[#1e1e1e] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md hover:border-[#1b6d24]/60 transition-all duration-300 group border-l-[4px] border-l-[#1b6d24] active:scale-[0.98]">
             <span class="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-[#1b6d24] mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110">find_in_page</span>
             <h4 class="text-base sm:text-lg md:text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1 sm:mb-2 transition-colors group-hover:text-[#1b6d24] dark:group-hover:text-[#88d982]">{{ t('dash.report_lost') }}</h4>
             <p class="text-xs sm:text-sm text-[#40493d] dark:text-[#9ca3af] mb-3 sm:mb-4 leading-relaxed line-clamp-2">{{ t('dash.report_lost_desc') }}</p>
             <div class="flex items-center text-[#387b41] font-bold text-xs sm:text-sm gap-1 sm:gap-2">{{ t('dash.start_report') }} <span class="material-symbols-outlined text-sm sm:text-base group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span></div>
           </RouterLink>
           <RouterLink to="/report" class="min-w-[75vw] sm:min-w-[65vw] md:min-w-[260px] snap-center bg-white dark:bg-[#1e1e1e] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md hover:border-[#387b41]/60 transition-all duration-300 group border-l-[4px] border-l-[#387b41] active:scale-[0.98]">
             <span class="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-[#387b41] mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110">add_a_photo</span>
             <h4 class="text-base sm:text-lg md:text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1 sm:mb-2 transition-colors group-hover:text-[#387b41] dark:group-hover:text-[#88d982]">{{ t('dash.report_found') }}</h4>
             <p class="text-xs sm:text-sm text-[#40493d] dark:text-[#9ca3af] mb-3 sm:mb-4 leading-relaxed line-clamp-2">{{ t('dash.report_found_desc') }}</p>
             <div class="flex items-center text-[#387b41] font-bold text-xs sm:text-sm gap-1 sm:gap-2">{{ t('dash.log_item') }} <span class="material-symbols-outlined text-sm sm:text-base group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span></div>
           </RouterLink>
           <RouterLink to="/scan" class="min-w-[75vw] sm:min-w-[65vw] md:min-w-[260px] snap-center bg-white dark:bg-[#1e1e1e] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md hover:border-[#387b41]/60 transition-all duration-300 group border-l-[4px] border-l-[#387b41] active:scale-[0.98]">
             <span class="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-[#387b41] mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110">qr_code_2</span>
             <h4 class="text-base sm:text-lg md:text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1 sm:mb-2 transition-colors group-hover:text-[#387b41] dark:group-hover:text-[#88d982]">{{ t('dash.scan_to_claim') }}</h4>
             <p class="text-xs sm:text-sm text-[#40493d] dark:text-[#9ca3af] mb-3 sm:mb-4 leading-relaxed line-clamp-2">{{ t('dash.scan_to_claim_desc') }}</p>
             <div class="flex items-center text-[#387b41] font-bold text-xs sm:text-sm gap-1 sm:gap-2">{{ t('dash.open_scanner') }} <span class="material-symbols-outlined text-sm sm:text-base group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span></div>
           </RouterLink>
           <RouterLink to="/statistics" class="min-w-[75vw] sm:min-w-[65vw] md:min-w-[260px] snap-center bg-white dark:bg-[#1e1e1e] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md hover:border-[#387b41]/60 transition-all duration-300 group border-l-[4px] border-l-[#387b41] active:scale-[0.98]">
             <span class="material-symbols-outlined text-2xl sm:text-3xl md:text-4xl text-[#387b41] mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110">leaderboard</span>
             <h4 class="text-base sm:text-lg md:text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1 sm:mb-2 transition-colors group-hover:text-[#387b41] dark:group-hover:text-[#88d982]">{{ t('nav.statistics') }}</h4>
             <p class="text-xs sm:text-sm text-[#40493d] dark:text-[#9ca3af] mb-3 sm:mb-4 leading-relaxed line-clamp-2">{{ t('stats.subtitle') }}</p>
             <div class="flex items-center text-[#387b41] font-bold text-xs sm:text-sm gap-1 sm:gap-2">Explore <span class="material-symbols-outlined text-sm sm:text-base group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span></div>
           </RouterLink>
         </div>
         
         <!-- DOT INDICATORS (clickable) -->
         <div class="flex justify-center items-center gap-2 mt-2">
           <button
             v-for="(_, i) in totalQuickActions" :key="i"
             @click="scrollToQuickAction(i)"
             :class="[
               'h-2 rounded-full transition-all duration-300',
               activeQuickActionIndex === i 
                 ? 'bg-[#387b41] dark:bg-[#88d982] w-6' 
                 : 'bg-[#d1d5db] dark:bg-[#4b5563] hover:bg-[#9ca3af] w-2'
             ]"
           />
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
        <div v-if="loadingRecs" class="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 md:gap-6 px-8 md:px-12">
          <ItemSkeleton v-for="i in 3" :key="i" />
        </div>
        <div v-else-if="recommendations.length === 0" class="text-center py-16 bg-white dark:bg-[#1e1e1e] rounded-[2rem] border border-dashed border-[#e0e4df] dark:border-[#374151]">
          <span class="material-symbols-outlined text-5xl text-[#40493d] dark:text-[#9ca3af]/10 mb-3">lightbulb</span>
          <p class="text-[#40493d] dark:text-[#9ca3af] font-medium">{{ t('dash.no_recommendations') }}</p>
        </div>
        <div v-else class="relative">
          <button v-if="recommendations.length > 6" @click="prevRecs" :disabled="recsOffset === 0"
            class="absolute left-0 md:-left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 p-blur-sm shadow-md flex items-center justify-center hover:bg-white dark:hover:bg-[#2a2a2a] transition-all disabled:opacity-30 disabled:pointer-events-none">
            <span class="material-symbols-outlined text-sm text-white">chevron_left</span>
          </button>

          <div class="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 md:gap-6 px-8 md:px-12">
            <ItemCard v-for="rec in visibleRecs" :key="rec.id" :item="rec" />
          </div>

          <button v-if="recommendations.length > 6" @click="nextRecs" :disabled="recsOffset + 6 >= recommendations.length"
            class="absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white dark:hover:bg-[#2a2a2a] transition-all disabled:opacity-30 disabled:pointer-events-none">
            <span class="material-symbols-outlined text-sm text-white ">chevron_right</span>
          </button>

          <div v-if="recommendations.length > 6" class="flex justify-center mt-4">
            <span class="text-xs text-[#40493d] dark:text-[#9ca3af] font-medium">{{ recsOffset / 6 + 1 }} / {{ Math.ceil(recommendations.length / 6) }}</span>
          </div>
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
        <div v-if="loadingItems" class="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 md:gap-6 mb-16">
          <ItemSkeleton v-for="i in 3" :key="i" />
        </div>
        <div v-else-if="items.length === 0" class="text-center py-20 bg-white dark:bg-[#1e1e1e] rounded-[2rem] border border-dashed border-[#e0e4df] dark:border-[#374151] mb-16">
          <span class="material-symbols-outlined text-6xl text-[#40493d] dark:text-[#9ca3af]/10 mb-4">inventory_2</span>
          <p class="text-[#40493d] dark:text-[#9ca3af] font-medium">{{ t('dash.no_items') }}</p>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 md:gap-6 mb-16">
          <ItemCard v-for="item in items" :key="item.id" :item="item" />
        </div>
      </section>
      
      <Footer />
    </main>
  </div>
</template>
