<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import QrcodeVue from 'qrcode.vue';
import SideNav from '../components/SideNav.vue';

const router = useRouter();
const items = ref<any[]>([]);
const isLoading = ref(true);

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchMyReports = async () => {
  try {
    const apiUrl = (import.meta as any).env.VITE_API_URL;
    // Uses the new /api/items/mine endpoint — backend scopes to authenticated user
    const res = await axios.get(`${apiUrl}/api/items/mine`, { headers: getAuthHeaders() });
    items.value = res.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
    console.error('Error fetching my reports:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchMyReports);

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] flex font-sans">
    <SideNav />

    <main class="md:ml-64 pt-12 px-8 pb-12 w-full max-w-[1200px] mx-auto">
      <div class="flex justify-between items-center mb-10">
        <div>
          <h2 class="text-3xl font-bold text-[#1c1b1b] tracking-tight">My Reports</h2>
          <p class="text-[#40493d] text-sm">Manage the items you have reported.</p>
        </div>
        <RouterLink to="/report" class="px-6 py-3 bg-[#387b41] text-white rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-[#2d6334] transition-all active:scale-95 text-sm">
          <span class="material-symbols-outlined">add</span> New Report
        </RouterLink>
      </div>

      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
      </div>

      <div v-else-if="items.length === 0" class="text-center py-32 bg-white rounded-[2.5rem] border border-dashed border-[#e0e4df]">
        <span class="material-symbols-outlined text-7xl text-[#40493d]/10 mb-6">inventory_2</span>
        <h3 class="text-xl font-bold text-[#1c1b1b] mb-2">No reports yet</h3>
        <p class="text-[#40493d] max-w-xs mx-auto">You haven't reported any items. All your reports will appear here.</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-6">
        <div v-for="item in items" :key="item._id" class="bg-white rounded-3xl p-6 border border-[#e0e4df] shadow-sm flex flex-col md:flex-row gap-8 hover:shadow-md transition-all">
          <div class="w-full md:w-48 h-48 rounded-2xl overflow-hidden bg-[#f3f5f2] flex-shrink-0">
            <img :src="item.imageUrl || 'https://placehold.co/400x300/f3f5f2/40493d?text=No+Image'" class="w-full h-full object-cover" loading="lazy" />
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
              <h4 class="text-2xl font-bold text-[#1c1b1b] mb-2">{{ item.name }}</h4>
              <div class="flex flex-wrap gap-x-6 gap-y-2">
                <p class="text-sm text-[#40493d] flex items-center gap-1"><span class="material-symbols-outlined text-lg">location_on</span> {{ item.location }}</p>
                <p class="text-sm text-[#40493d] flex items-center gap-1"><span class="material-symbols-outlined text-lg">calendar_today</span> {{ formatDate(item.reportedAt) }}</p>
                <p class="text-sm text-[#40493d] flex items-center gap-1"><span class="material-symbols-outlined text-lg">category</span> {{ item.category }}</p>
              </div>
              <p class="mt-4 text-sm text-[#40493d] italic leading-relaxed" v-if="item.description">"{{ item.description }}"</p>
            </div>
          </div>
          <div class="flex flex-col items-center justify-center p-6 bg-[#f3f5f2] rounded-2xl border border-[#e0e4df] min-w-[200px]">
            <p class="text-[10px] font-bold text-[#40493d] mb-4 uppercase tracking-[0.2em]">Claim QR Code</p>
            <div class="p-3 bg-white rounded-xl shadow-inner mb-4">
              <qrcode-vue :value="item._id" :size="100" level="H" foreground="#1c1b1b" />
            </div>
            <p class="text-[9px] text-[#40493d] text-center font-medium max-w-[140px]">Owner can scan this QR to confirm receipt.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
