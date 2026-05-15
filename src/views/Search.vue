<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { useRouter, useRoute } from 'vue-router';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import ItemCard from '../components/ItemCard.vue';
import Footer from '../components/Footer.vue';
import { API_URL } from '@/config/api';
import { useI18n } from '../i18n';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const items = ref<any[]>([]);
const isLoading = ref(true);
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const searchInput = ref((route.query.q as string) || '');
const filterType = ref<string>((route.query.type as string) || 'all');
const filterCategory = ref<string>((route.query.category as string) || 'all');
const categories = ['Electronics', 'Daily Use', 'Clothing', 'Books/Stationery', 'Others'];

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchItems = async () => {
  isLoading.value = true;
  try {
    const params: any = { page: currentPage.value, limit: 12 };
    if (searchInput.value.trim()) {
      params.q = searchInput.value.trim();
    }
    if (filterCategory.value !== 'all') {
      params.category = filterCategory.value;
    }
    const res = await axios.get(`${API_URL}/api/items`, { headers: getAuthHeaders(), params });
    items.value = res.data.items || [];
    currentPage.value = res.data.currentPage || 1;
    totalPages.value = res.data.totalPages || 1;
    totalItems.value = res.data.totalItems || 0;
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
    items.value = [];
    console.error('Error fetching items:', error);
  } finally {
    isLoading.value = false;
  }
};

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchItems();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchItems();
};

const filteredItems = computed(() => {
  let result = items.value;
  if (filterType.value === 'lost') {
    result = result.filter(item => item.type === 'lost');
  } else if (filterType.value === 'found') {
    result = result.filter(item => item.type === 'found');
  }
  const q = searchInput.value.toLowerCase().trim();
  if (q) {
    result = result.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q))
    );
  }
  return result;
});

const pageNumbers = computed(() => {
  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages.value, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

onMounted(fetchItems);

watch(() => route.query, (newQuery) => {
  if (newQuery.q) {
    searchInput.value = newQuery.q as string;
    fetchItems();
  }
});
</script>

<template>
  <div class="min-h-screen  bg-[#f8faf7] dark:bg-[#121212] flex pb-10">
    <SideNav />
    <TopNav />

    <main class="md:ml-64 pt-24 px-4 sm:px-6 md:px-8 pb-12 w-full max-w-[1200px] mx-auto">
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] tracking-tight">{{ t('search.title') }}</h2>
        <p class="text-[#40493d] dark:text-[#9ca3af] text-sm mt-1">{{ t('search.subtitle') }}</p>
      </div>

      <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm mb-8">
        <div class="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div class="relative flex-1">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#40493d] dark:text-[#9ca3af]">search</span>
            <input v-model="searchInput" @keyup.enter="handleSearch" type="text" :placeholder="t('search.input_placeholder')"
              class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#387b41] outline-none" />
          </div>
          <button @click="handleSearch"
            class="px-8 py-3 bg-[#387b41] text-white rounded-xl font-bold hover:bg-[#2d6334] transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2">
            <span class="material-symbols-outlined">search</span>
            {{ t('search.title') }}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between mb-6">
        <div class="flex gap-2">
          <button @click="filterType = 'all'"
            :class="['px-5 py-2 rounded-xl text-xs font-bold transition-all', filterType === 'all' ? 'bg-[#387b41] text-white shadow-sm' : 'bg-white dark:bg-[#1e1e1e] text-[#40493d] dark:text-[#9ca3af] border border-[#e0e4df] dark:border-[#374151] hover:border-[#387b41]']">
            {{ t('search.all') }}
          </button>
          <button @click="filterType = 'lost'"
            :class="['px-5 py-2 rounded-xl text-xs font-bold transition-all', filterType === 'lost' ? 'bg-[#ba1a1a] text-white shadow-sm' : 'bg-white dark:bg-[#1e1e1e] text-[#40493d] dark:text-[#9ca3af] border border-[#e0e4df] dark:border-[#374151] hover:border-[#ba1a1a]']">
            {{ t('search.lost') }}
          </button>
          <button @click="filterType = 'found'"
            :class="['px-5 py-2 rounded-xl text-xs font-bold transition-all', filterType === 'found' ? 'bg-[#1b6d24] text-white shadow-sm' : 'bg-white dark:bg-[#1e1e1e] text-[#40493d] dark:text-[#9ca3af] border border-[#e0e4df] dark:border-[#374151] hover:border-[#387b41]']">
            {{ t('search.found') }}
          </button>
        </div>
        <span v-if="!isLoading" class="text-xs text-[#40493d] dark:text-[#9ca3af] font-medium">
          {{ t('search.result_count') }} {{ filteredItems.length }} {{ t('search.results') }}
        </span>
      </div>

      <div class="flex gap-2 mb-6 flex-wrap">
        <button @click="filterCategory = 'all'; handleSearch()"
          :class="['px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all', filterCategory === 'all' ? 'bg-[#387b41] text-white shadow-sm' : 'bg-white dark:bg-[#1e1e1e] text-[#40493d] dark:text-[#9ca3af] border border-[#e0e4df] dark:border-[#374151] hover:border-[#387b41]']">
          {{ t('search.all_categories') }}
        </button>
        <button v-for="cat in categories" :key="cat" @click="filterCategory = cat; handleSearch()"
          :class="['px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all', filterCategory === cat ? 'bg-[#387b41] text-white shadow-sm' : 'bg-white dark:bg-[#1e1e1e] text-[#40493d] dark:text-[#9ca3af] border border-[#e0e4df] dark:border-[#374151] hover:border-[#387b41]']">
          {{ t(`card.category.${cat}`) }}
        </button>
      </div>

      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
      </div>

      <div v-else-if="filteredItems.length === 0" class="text-center py-32 bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border border-dashed border-[#e0e4df] dark:border-[#374151]">
        <span class="material-symbols-outlined text-7xl text-[#40493d] dark:text-[#9ca3af]/10 mb-6">search</span>
        <h3 class="text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2">{{ t('search.no_results') }}</h3>
        <p class="text-[#40493d] dark:text-[#9ca3af] max-w-xs mx-auto text-sm">{{ t('search.no_results_sub') }}</p>
      </div>

      <div v-else>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 mb-10">
          <ItemCard v-for="item in filteredItems" :key="item._id" :item="item" />
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 py-6">
          <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1"
            class="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1"
            :class="currentPage <= 1 ? 'bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#40493d]/40 dark:text-[#9ca3af]/40 cursor-not-allowed' : 'bg-white dark:bg-[#1e1e1e] text-[#40493d] dark:text-[#9ca3af] border border-[#e0e4df] dark:border-[#374151] hover:border-[#387b41]'">
            <span class="material-symbols-outlined text-base">chevron_left</span>
            {{ t('search.prev') }}
          </button>

          <button v-for="page in pageNumbers" :key="page" @click="goToPage(page)"
            :class="['w-10 h-10 rounded-xl text-sm font-bold transition-all', page === currentPage ? 'bg-[#387b41] text-white shadow-sm' : 'bg-white dark:bg-[#1e1e1e] text-[#40493d] dark:text-[#9ca3af] border border-[#e0e4df] dark:border-[#374151] hover:border-[#387b41]']">
            {{ page }}
          </button>

          <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages"
            class="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1"
            :class="currentPage >= totalPages ? 'bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#40493d]/40 dark:text-[#9ca3af]/40 cursor-not-allowed' : 'bg-white dark:bg-[#1e1e1e] text-[#40493d] dark:text-[#9ca3af] border border-[#e0e4df] dark:border-[#374151] hover:border-[#387b41]'">
            {{ t('search.next') }}
            <span class="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>

        <div class="text-center text-xs text-[#40493d] dark:text-[#9ca3af] font-medium py-4">
          {{ t('search.page') }} {{ currentPage }} {{ t('search.of') }} {{ totalPages }}
        </div>
      </div>

      <Footer />
    </main>
  </div>
</template>
