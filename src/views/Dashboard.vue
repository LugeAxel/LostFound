<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { RouterLink, useRouter } from 'vue-router';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import ItemCard from '../components/ItemCard.vue';

const router = useRouter();
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'));
const items = ref<any[]>([]);
const stats = ref({ currentlyLost: 0, foundToday: 0, returnedAllTime: 0 });

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchStats = async () => {
  try {
    const apiUrl = (import.meta as any).env.VITE_API_URL;
    const res = await axios.get(`${apiUrl}/api/stats`, { headers: getAuthHeaders() });
    stats.value = res.data;
  } catch (error: any) {
    if (error.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/'); }
    console.error('Error fetching stats:', error);
  }
};

const fetchItems = async () => {
  try {
    const apiUrl = (import.meta as any).env.VITE_API_URL;
    const res = await axios.get(`${apiUrl}/api/items`, { headers: getAuthHeaders() });
    items.value = res.data;
  } catch (error: any) {
    if (error.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/'); }
    console.error('Error fetching items:', error);
  }
};

onMounted(() => { fetchStats(); fetchItems(); });
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] flex">
    <SideNav />

    <TopNav />

    <!-- Main Content -->
    <main class="md:ml-64 pt-24 px-8 pb-12 min-h-screen w-full max-w-[1200px] mx-auto">
      <!-- Welcome Banner -->
      <section class="mb-10">
        <div class="relative overflow-hidden rounded-[2rem] bg-[#387b41] p-10 text-white flex justify-between items-center shadow-lg">
          <div class="relative z-10 max-w-xl">
            <h2 class="text-4xl font-bold mb-4 tracking-tight">Welcome back, {{ user.nama ? user.nama.split(' ')[0] : 'Student' }}!</h2>
            <p class="text-lg opacity-90 mb-8 leading-relaxed">Lost something on campus? Our digital concierge helps you find your belongings.</p>
            <div class="flex gap-4">
              <RouterLink to="/my-reports" class="px-6 py-3 bg-white text-[#387b41] rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-md">View My Items</RouterLink>
              <button class="px-6 py-3 bg-transparent border border-white/40 text-white rounded-xl font-bold hover:bg-white/10 transition-all">How it works</button>
            </div>
          </div>
          <div class="absolute right-10 top-1/2 -translate-y-1/2 h-4/5 w-1/4 opacity-20 flex items-center justify-center pointer-events-none">
            <span class="material-symbols-outlined text-[180px] scale-150">inventory_2</span>
          </div>
        </div>
      </section>

      <!-- Stats Grid -->
      <section class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div class="bg-white p-6 rounded-2xl border border-[#e0e4df] shadow-sm flex items-center gap-5">
          <div class="w-14 h-14 rounded-full bg-[#fef2f2] flex items-center justify-center text-[#ef4444]">
            <span class="material-symbols-outlined text-2xl">search</span>
          </div>
          <div>
            <p class="text-xs text-[#40493d] font-bold uppercase tracking-wider">Currently Lost</p>
            <h3 class="text-2xl font-bold text-[#1c1b1b]">{{ stats.currentlyLost.toLocaleString() }} Items</h3>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-[#e0e4df] shadow-sm flex items-center gap-5">
          <div class="w-14 h-14 rounded-full bg-[#f0fdf4] flex items-center justify-center text-[#22c55e]">
            <span class="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div>
            <p class="text-xs text-[#40493d] font-bold uppercase tracking-wider">Found Today</p>
            <h3 class="text-2xl font-bold text-[#1c1b1b]">{{ stats.foundToday.toLocaleString() }} Items</h3>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-[#e0e4df] shadow-sm flex items-center gap-5">
          <div class="w-14 h-14 rounded-full bg-[#f0f9ff] flex items-center justify-center text-[#0ea5e9]">
            <span class="material-symbols-outlined text-2xl">handshake</span>
          </div>
          <div>
            <p class="text-xs text-[#40493d] font-bold uppercase tracking-wider">Returned All-time</p>
            <h3 class="text-2xl font-bold text-[#1c1b1b]">{{ stats.returnedAllTime.toLocaleString() }} Items</h3>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="mb-12">
        <h3 class="text-lg font-bold mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-[#387b41]">bolt</span> Quick Actions
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <RouterLink to="/report" class="bg-white rounded-[2rem] p-8 border border-[#e0e4df] shadow-sm hover:shadow-md transition-all group border-l-[6px] border-l-[#1b6d24]">
            <span class="material-symbols-outlined text-4xl text-[#1b6d24] mb-6">find_in_page</span>
            <h4 class="text-xl font-bold mb-2">Report Lost</h4>
            <p class="text-sm text-[#40493d] mb-6 leading-relaxed">Misplaced something? Let the community know.</p>
            <div class="flex items-center text-[#1b6d24] font-bold text-sm gap-2">Start Report <span class="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span></div>
          </RouterLink>
          <RouterLink to="/report" class="bg-white rounded-[2rem] p-8 border border-[#e0e4df] shadow-sm hover:shadow-md transition-all group border-l-[6px] border-l-[#387b41]">
            <span class="material-symbols-outlined text-4xl text-[#387b41] mb-6">add_a_photo</span>
            <h4 class="text-xl font-bold mb-2">Report Found</h4>
            <p class="text-sm text-[#40493d] mb-6 leading-relaxed">Found someone's property? Log the details here.</p>
            <div class="flex items-center text-[#387b41] font-bold text-sm gap-2">Log Item <span class="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span></div>
          </RouterLink>
          <RouterLink to="/scan" class="bg-white rounded-[2rem] p-8 border border-[#e0e4df] shadow-sm hover:shadow-md transition-all group border-l-[6px] border-l-[#707a6c]">
            <span class="material-symbols-outlined text-4xl text-[#707a6c] mb-6">qr_code_2</span>
            <h4 class="text-xl font-bold mb-2">Scan to Claim</h4>
            <p class="text-sm text-[#40493d] mb-6 leading-relaxed">At the concierge desk? Scan the QR code to verify.</p>
            <div class="flex items-center text-[#1c1b1b] font-bold text-sm gap-2">Open Scanner <span class="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span></div>
          </RouterLink>
        </div>
      </section>

      <!-- Recent Items -->
      <section>
        <div class="flex justify-between items-end mb-8">
          <div>
            <h3 class="text-lg font-bold">Recent Items</h3>
            <p class="text-sm text-[#40493d]">Newly reported items in the school ecosystem</p>
          </div>
        </div>
        <div v-if="items.length === 0" class="text-center py-20 bg-white rounded-[2rem] border border-dashed border-[#e0e4df]">
          <span class="material-symbols-outlined text-6xl text-[#40493d]/10 mb-4">inventory_2</span>
          <p class="text-[#40493d] font-medium">No items reported yet.</p>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ItemCard v-for="item in items" :key="item._id" :item="item" />
        </div>
      </section>
    </main>
  </div>
</template>
