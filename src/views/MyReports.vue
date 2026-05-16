<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import QrcodeVue from 'qrcode.vue';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import { API_URL } from '@/config/api';
import { useToast } from '../composables/useToast';
import { getAuthHeaders } from '../composables/useAuth';
import { supabase } from '../lib/supabase';
import { useI18n } from '../i18n';

const router = useRouter();
const toast = useToast();
const { t } = useI18n();
const items = ref<any[]>([]);
const isLoading = ref(true);
const itemMatches = ref<Record<string, any[]>>({});
const filterAreaCategory = ref('all');

const areaCategories = [
  'Ruang Teori', 'Laboratorium', 'Masjid', 'Kantin', 'Koperasi',
  'Bima', 'Yudhistira', 'Arjuna', 'Lapangan', 'Kantor',
  'Parkir', 'Bengkel', 'Bangunan Kimia', 'Bangunan GP'
];

const filteredItems = computed(() => {
  if (filterAreaCategory.value === 'all') return items.value;
  return items.value.filter(i => i.area_category === filterAreaCategory.value);
});

const fetchMyReports = async () => {
  try {
    // Uses the new /api/items/mine endpoint — backend scopes to authenticated user
    const res = await axios.get(`${API_URL}/api/items/mine`, { headers: await getAuthHeaders() });
    items.value = res.data;
    await fetchSuggestions();
  } catch (error: any) {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
    console.error('Error fetching my reports:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchSuggestions = async () => {
  try {
    const lostItems = items.value.filter((i: any) => i.type === 'lost' && i.status !== 'Returned');
    if (lostItems.length === 0) {
      itemMatches.value = {};
      return;
    }
    const headers = await getAuthHeaders();
    const results = await Promise.allSettled(
      lostItems.map((item: any) =>
        axios.get(`${API_URL}/api/items/matches/${item.id}`, { headers })
          .then(res => ({ itemId: item.id, matches: res.data }))
      )
    );
    const map: Record<string, any[]> = {};
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.matches?.length > 0) {
        map[result.value.itemId] = result.value.matches;
      }
    }
    itemMatches.value = map;
  } catch (error) {
    console.error('Error fetching suggestions:', error);
  }
};

onMounted(fetchMyReports);

const getClaimUrl = (code: string) => {
  return `${window.location.origin}/claim/${code}`;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.show('Copied to clipboard', 'success');
  } catch {
    toast.show('Failed to copy', 'error');
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex font-sans pt-10">
    <SideNav />
    <TopNav />

    <main class="md:ml-64 pt-24 px-4 sm:px-6 md:px-8 pb-12 w-full max-w-[1200px] mx-auto">
      <div class="flex justify-between items-center mb-10">
        <div>
          <h2 class="text-3xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] tracking-tight">My Reports</h2>
          <p class="text-[#40493d] dark:text-[#9ca3af] text-sm">Manage the items you have reported.</p>
        </div>
        <RouterLink to="/report" class="px-6 py-3 bg-[#387b41] text-white rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-[#2d6334] transition-all active:scale-95 text-sm">
          <span class="material-symbols-outlined">add</span> New Report
        </RouterLink>
      </div>

      <div class="relative w-full sm:w-auto min-w-[220px] mb-6">
        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#40493d] dark:text-[#9ca3af] text-lg pointer-events-none">business</span>
        <select v-model="filterAreaCategory"
          class="w-full bg-white dark:bg-[#1e1e1e] dark:text-white border-2 border-[#e0e4df] dark:border-[#374151] rounded-xl px-5 py-3 pl-12 focus:border-[#387b41] outline-none transition-all text-xs font-medium appearance-none cursor-pointer">
          <option value="all">All Areas</option>
          <option v-for="area in areaCategories" :key="area" :value="area">{{ area }}</option>
        </select>
        <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#40493d] dark:text-[#9ca3af]">expand_more</span>
      </div>

      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
      </div>

      <div v-else-if="filteredItems.length === 0" class="text-center py-32 bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border border-dashed border-[#e0e4df] dark:border-[#374151]">
        <span class="material-symbols-outlined text-7xl text-[#40493d] dark:text-[#9ca3af]/10 mb-6">inventory_2</span>
        <h3 class="text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2">No reports yet</h3>
        <p class="text-[#40493d] dark:text-[#9ca3af] max-w-xs mx-auto">You haven't reported any items. All your reports will appear here.</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-6">
        <div v-for="item in filteredItems" :key="item.id" class="bg-white dark:bg-[#1e1e1e] rounded-3xl p-4 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div v-if="item.status === 'Returned'" class=" z-19 absolute top-0 right-0 px-8 py-1 bg-[#387b41] text-white text-[10px] font-bold uppercase tracking-widest rotate-45 translate-x-8 translate-y-4">Returned</div>
          
          <div class="flex flex-col md:flex-row gap-4 md:gap-8">
            <div class="w-full md:w-48 h-48 rounded-2xl overflow-hidden bg-[#f3f5f2] dark:bg-[#2a2a2a] flex-shrink-0 relative group">
              <img :src="item.image_url || (item.type === 'lost' ? '/lost-default.svg' : '/found-default.svg')" 
                :class="['w-full h-full object-cover', !item.image_url && 'p-8 opacity-20']" loading="lazy" />
              <div v-if="!item.image_url" class="absolute inset-0 flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl text-[#40493d] dark:text-[#9ca3af]/40">{{ item.type === 'lost' ? 'search' : 'inventory_2' }}</span>
              </div>
            </div>

            <div class="flex-1 flex flex-col justify-between py-2">
              <div>
                <div class="flex items-center gap-3 mb-3">
                  <span :class="['text-[10px] px-3 py-1 rounded-full font-bold tracking-wider', item.type === 'lost' ? 'bg-[#fef2f2] text-[#ba1a1a]' : 'bg-[#f0fdf4] text-[#387b41]']">
                    {{ item.type.toUpperCase() }}
                  </span>
                  <span :class="['text-[10px] px-3 py-1 rounded-full font-bold', item.status === 'Available' ? 'bg-[#abf4ac] text-[#07521d]' : 'bg-[#dee5d6] text-[#42493e]']">
                    {{ item.status }}
                  </span>
                </div>
                <h4 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2">{{ item.name }}</h4>
                <div class="flex flex-wrap gap-x-6 gap-y-2">
                  <p class="text-sm text-[#40493d] dark:text-[#9ca3af] flex items-center gap-1"><span class="material-symbols-outlined text-lg">location_on</span> {{ item.type === 'lost' ? t('detail.last_seen') + ' ' + item.location : t('detail.found_at') + ' ' + item.location }}</p>
                  <p class="text-sm text-[#40493d] dark:text-[#9ca3af] flex items-center gap-1"><span class="material-symbols-outlined text-lg">calendar_today</span> {{ formatDate(item.reported_at) }}</p>
                  <p class="text-sm text-[#40493d] dark:text-[#9ca3af] flex items-center gap-1"><span class="material-symbols-outlined text-lg">category</span> {{ item.category }}</p>
                </div>
                <div v-if="item.coordinates_lat != null && item.coordinates_lng != null" class="mt-2 flex items-center gap-2">
                  <span class="text-[10px] text-[#387b41] font-bold flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">gps_fixed</span>
                    {{ item.coordinates_lat.toFixed(4) }}, {{ item.coordinates_lng.toFixed(4) }}
                  </span>
                  <button @click="copyText(`${item.coordinates_lat},${item.coordinates_lng}`)"
                    class="text-[10px] text-[#387b41] hover:text-[#2d6334] font-bold flex items-center gap-0.5 transition-colors"
                    title="Copy GPS coordinates">
                    <span class="material-symbols-outlined text-xs">content_copy</span>
                  </button>
                </div>
                <p class="mt-4 text-sm text-[#40493d] dark:text-[#9ca3af] italic leading-relaxed" v-if="item.description">"{{ item.description }}"</p>
              </div>

              <!-- Proof of Return -->
              <div v-if="item.status === 'Returned' && item.claim_photo" class="mt-6 pt-6 border-t border-[#e0e4df] dark:border-[#374151]">
                <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] mb-3 uppercase tracking-wider">Proof of Return</p>
                <div class="flex gap-4 items-center">
                  <img :src="item.claim_photo" class="w-16 h-16 rounded-lg object-cover border border-[#e0e4df] dark:border-[#374151]" />
                  <div>
                    <p class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">Verified Return</p>
                    <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af]">{{ item.claim_notes || 'Handed over to owner.' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="item.status !== 'Returned'" class="flex flex-col items-center justify-center p-4 md:p-6 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-2xl border border-[#e0e4df] dark:border-[#374151] min-w-[200px]">
              <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] mb-4 uppercase tracking-[0.2em]">Claim QR Code</p>
              <div class="p-3 bg-white rounded-xl shadow-inner mb-4">
                <qrcode-vue :value="getClaimUrl(item.claim_code)" :size="100" level="H" foreground="#1c1b1b" class=""/>
              </div>
              <div class="mb-2 flex items-center gap-1 bg-[#e0e4df] dark:bg-[#374151] px-3 py-1.5 rounded-lg">
                <span class="text-[9px] font-mono text-[#40493d] dark:text-[#9ca3af] truncate max-w-[120px]">{{ item.claim_code }}</span>
                <button @click="copyText(item.claim_code)"
                  class="text-[#387b41] hover:text-[#2d6334] transition-colors shrink-0"
                  title="Copy item ID">
                  <span class="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
              <p v-if="item.status === 'On Progress'" class="text-[9px] text-[#f57f17] text-center font-bold max-w-[140px] mb-2">CLAIM IN PROGRESS</p>
              <p class="text-[9px] text-[#40493d] dark:text-[#9ca3af] text-center font-medium max-w-[140px]">Owner can scan this QR to confirm receipt.</p>
            </div>
            <div v-else class="flex flex-col items-center justify-center p-4 md:p-6 bg-[#f0fdf4] rounded-2xl border border-[#abf4ac] min-w-[200px]">
              <span class="material-symbols-outlined text-4xl text-[#387b41] mb-2">check_circle</span>
              <p class="text-xs font-bold text-[#387b41]">Returned Successfully</p>
            </div>
          </div>

          <!-- This Might Be Your Item (per lost item matches) -->
          <div v-if="item.type === 'lost' && itemMatches[item.id]?.length" class="mt-6 pt-5 border-t border-[#e0e4df] dark:border-[#374151]">
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-[#f57f17] text-base">lightbulb</span>
              <h4 class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t('myreports.suggestions_title') }}</h4>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="match in itemMatches[item.id]" :key="match.id" @click="router.push(`/item/${match.id}`)"
                class="bg-[#f8faf7] dark:bg-[#121212] rounded-xl border border-[#e0e4df] dark:border-[#374151] overflow-hidden hover:shadow-md hover:border-[#387b41]/30 transition-all cursor-pointer group flex gap-4 p-3">
                <div class="w-20 h-20 rounded-lg bg-[#f3f5f2] dark:bg-[#2a2a2a] overflow-hidden flex-shrink-0">
                  <img v-if="match.image_url" :src="match.image_url" :class="['w-full h-full object-cover', match.status === 'Returned' && 'grayscale opacity-70']" />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-xl text-[#40493d] dark:text-[#9ca3af]/20">inventory_2</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                  <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6] truncate">{{ match.name }}</span>
                    <span class="px-2 py-0.5 bg-[#387b41]/10 text-[#387b41] text-[10px] font-bold rounded-full uppercase shrink-0">{{ t('myreports.suggestions_match') }}</span>
                    <span v-if="match.status === 'Available'" class="px-2 py-0.5 bg-[#abf4ac] text-[#07521d] text-[10px] ml-1 font-bold rounded-full uppercase shrink-0">{{ t('card.status.Available') }}</span>
                    <span v-else-if="match.status === 'On Progress'" class="px-2 py-0.5 bg-[#ffecb3] text-[#f57f17] text-[10px] ml-1 font-bold rounded-full uppercase shrink-0">{{ t('card.status.On Progress') }}</span>
                    <span v-else-if="match.status === 'Returned'" class="px-2 py-0.5 bg-[#dee5d6] text-[#42493e] text-[10px] ml-1 font-bold rounded-full uppercase shrink-0">{{ t('card.status.Returned') }}</span>
                  </div>
                  <p class="text-xs text-[#40493d] dark:text-[#9ca3af] truncate flex items-center gap-1">
                    <span class="material-symbols-outlined text-[10px]">location_on</span>
                    {{ match.location }}
                  </p>
                  <p v-if="match.distance_meters != null" class="text-xs text-[#387b41] font-bold mt-0.5 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[10px]">near_me</span>
                    {{ match.distance_meters }}m {{ t('myreports.suggestions_distance') }}
                  </p>
                  <p v-else class="text-xs text-[#ba1a1a] font-bold mt-0.5 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[10px]">gps_off</span>
                    {{ t('card.no_gps') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
