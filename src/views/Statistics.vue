<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useHead } from '@unhead/vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import { useI18n } from '../i18n';
import { API_URL } from '@/config/api';
import { getAuthHeaders } from '../composables/useAuth';
import { useRealtimeAllItems } from '../composables/useRealtimeAllItems';

const router = useRouter();
const { t } = useI18n();
useHead({ title: () => `${t('stats.title')} — QReturn` });

const itemsPerDay = ref<any[]>([]);
const topLocations = ref<any[]>([]);
const topCategories = ref<any[]>([]);
const funFacts = ref<any>({});
const isLoading = ref(true);

const maxDayCount = ref(0);
const maxCategoryCount = ref(0);

const fetchStats = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/stats/detailed`, { headers: await getAuthHeaders() });
    itemsPerDay.value = res.data.itemsPerDay;
    topLocations.value = res.data.topLocations;
    topCategories.value = res.data.topCategories;
    funFacts.value = res.data.funFacts;

    maxDayCount.value = Math.max(
      ...res.data.itemsPerDay.map((d: any) => d.lost + d.found + d.returned),
      1
    );
    maxCategoryCount.value = Math.max(
      ...res.data.topCategories.map((c: any) => c.count),
      1
    );
  } catch (error) {
    console.error('Error fetching stats:', error);
  } finally {
    isLoading.value = false;
  }
};

const { subscribe: subscribeToAllItems } = useRealtimeAllItems(() => {
  fetchStats();
}, 1000);

onMounted(() => {
  fetchStats();
  subscribeToAllItems();
});
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex font-sans">
    <SideNav />
    <TopNav />

    <main class="md:ml-64 pt-24 px-4 sm:px-6 md:px-8 pb-24 md:pb-12 w-full max-w-[1200px] mx-auto">
      <button @click="router.push('/dashboard')"
        class="flex items-center gap-2 text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] mb-6 sm:mb-8 transition-colors font-bold text-sm group">
        <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        {{ t('detail.back') }}
      </button>

      <div class="mb-8">
        <h2 class="text-2xl sm:text-3xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] tracking-tight">{{ t('stats.title') }}</h2>
        <p class="text-sm text-[#40493d] dark:text-[#9ca3af] mt-1">{{ t('stats.subtitle') }}</p>
      </div>

      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <!-- Fun Facts Grid -->
        <section class="mb-8 sm:mb-10">
          <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-4 sm:mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined text-[#387b41]">celebration</span>
            {{ t('stats.fun_facts') }}
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 sm:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
              <span class="material-symbols-outlined text-2xl text-[#387b41]">location_on</span>
              <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider mt-3 mb-1">{{ t('stats.most_common_location') }}</p>
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6] truncate">{{ funFacts.mostCommonLocation }}</p>
            </div>
            <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 sm:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
              <span class="material-symbols-outlined text-2xl text-[#f59e0b]">category</span>
              <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider mt-3 mb-1">{{ t('stats.most_lost_category') }}</p>
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ funFacts.mostLostCategory }}</p>
            </div>
            <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 sm:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
              <span class="material-symbols-outlined text-2xl text-[#8b5cf6]">calendar_month</span>
              <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider mt-3 mb-1">{{ t('stats.busiest_day') }}</p>
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ funFacts.busiestDay }}</p>
            </div>
            <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 sm:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
              <span class="material-symbols-outlined text-2xl text-[#22c55e]">check_circle</span>
              <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider mt-3 mb-1">{{ t('stats.return_rate') }}</p>
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ funFacts.returnRate }}%</p>
            </div>
            <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 sm:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
              <span class="material-symbols-outlined text-2xl text-[#0ea5e9]">schedule</span>
              <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider mt-3 mb-1">{{ t('stats.avg_return_time') }}</p>
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ funFacts.avgDaysToReturn }} {{ t('stats.days') }}</p>
            </div>
            <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 sm:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
              <span class="material-symbols-outlined text-2xl text-[#ef4444]">inventory_2</span>
              <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider mt-3 mb-1">{{ t('stats.total_items') }}</p>
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ funFacts.totalItems }} {{ t('stats.items') }}</p>
            </div>
          </div>
        </section>

        <!-- Items Per Day Chart -->
        <section class="mb-8 sm:mb-10">
          <div class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] p-4 sm:p-6 md:p-8 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
            <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#387b41]">bar_chart</span>
              {{ t('stats.lost_per_day') }}
            </h3>

            <!-- Legend -->
            <div class="flex flex-wrap gap-4 mb-6 text-xs">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded bg-[#ef4444]"></div>
                <span class="text-[#40493d] dark:text-[#9ca3af] font-medium">{{ t('stats.lost') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded bg-[#387b41]"></div>
                <span class="text-[#40493d] dark:text-[#9ca3af] font-medium">{{ t('stats.founded') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded bg-[#0ea5e9]"></div>
                <span class="text-[#40493d] dark:text-[#9ca3af] font-medium">{{ t('stats.returned') }}</span>
              </div>
            </div>

            <!-- Chart -->
            <div class="flex items-end gap-1 sm:gap-2" style="min-height: 200px">
              <div v-for="day in itemsPerDay" :key="day.date" class="flex-1 flex flex-col items-center gap-1">
                <div class="flex items-stretch gap-px w-full" style="height: 180px">
                  <div class="flex-1 flex flex-col items-center justify-end relative group">
                    <div class="w-full min-h-[3px] bg-[#ef4444] rounded-t-sm transition-all duration-500 relative" 
                      :style="{ height: maxDayCount > 0 ? (day.lost / maxDayCount) * 100 + '%' : '0%' }">
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1c1b1b] dark:bg-[#f3f4f6] text-white dark:text-[#1c1b1b] text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-10 pointer-events-none mb-2">
                        {{ t('stats.lost') }}: {{ day.lost }}
                      </div>
                    </div>
                  </div>
                  <div class="flex-1 flex flex-col items-center justify-end relative group">
                    <div class="w-full min-h-[3px] bg-[#387b41] rounded-t-sm transition-all duration-500 relative" 
                      :style="{ height: maxDayCount > 0 ? (day.found / maxDayCount) * 100 + '%' : '0%' }">
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1c1b1b] dark:bg-[#f3f4f6] text-white dark:text-[#1c1b1b] text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-10 pointer-events-none mb-2">
                        {{ t('stats.founded') }}: {{ day.found }}
                      </div>
                    </div>
                  </div>
                  <div class="flex-1 flex flex-col items-center justify-end relative group">
                    <div class="w-full min-h-[3px] bg-[#0ea5e9] rounded-t-sm transition-all duration-500 relative" 
                      :style="{ height: maxDayCount > 0 ? (day.returned / maxDayCount) * 100 + '%' : '0%' }">
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1c1b1b] dark:bg-[#f3f4f6] text-white dark:text-[#1c1b1b] text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-10 pointer-events-none mb-2">
                        {{ t('stats.returned') }}: {{ day.returned }}
                      </div>
                    </div>
                  </div>
                </div>
                <span class="text-[9px] sm:text-[10px] text-[#40493d] dark:text-[#9ca3af] font-medium truncate w-full text-center">{{ day.date.slice(5) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Categories Chart -->
        <section class="mb-8 sm:mb-10">
          <div class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] p-4 sm:p-6 md:p-8 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
            <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#387b41]">pie_chart</span>
              {{ t('stats.by_category') }}
            </h3>

            <div class="space-y-4">
              <div v-for="cat in topCategories" :key="cat.category" class="space-y-1">
                <div class="flex justify-between text-sm">
                  <span class="font-medium text-[#1c1b1b] dark:text-[#f3f4f6]">{{ cat.category }}</span>
                  <span class="text-[#40493d] dark:text-[#9ca3af]">{{ cat.count }} {{ t('stats.items') }}</span>
                </div>
                <div class="relative group">
                  <div class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-full h-3 overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-[#387b41] to-[#88d982] transition-all duration-700 relative"
                      :style="{ width: (cat.count / maxCategoryCount) * 100 + '%' }">
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1c1b1b] dark:bg-[#f3f4f6] text-white dark:text-[#1c1b1b] text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-10 pointer-events-none">
                        {{ cat.count }} {{ t('stats.items') }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Locations -->
        <section v-if="topLocations.length > 0">
          <div class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] p-4 sm:p-6 md:p-8 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
            <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-6 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#387b41]">map</span>
              {{ t('stats.most_common_location') }}
            </h3>

            <div class="space-y-4">
              <div v-for="loc in topLocations" :key="loc.location" class="space-y-1">
                <div class="flex justify-between text-sm">
                  <span class="font-medium text-[#1c1b1b] dark:text-[#f3f4f6]">{{ loc.location }}</span>
                  <span class="text-[#40493d] dark:text-[#9ca3af]">{{ loc.count }} {{ t('stats.items') }}</span>
                </div>
                <div class="relative group">
                  <div class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-full h-3 overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] transition-all duration-700 relative"
                      :style="{ width: (loc.count / Math.max(...topLocations.map(l => l.count), 1)) * 100 + '%' }">
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1c1b1b] dark:bg-[#f3f4f6] text-white dark:text-[#1c1b1b] text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-10 pointer-events-none">
                        {{ loc.count }} {{ t('stats.items') }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
