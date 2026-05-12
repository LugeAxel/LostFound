<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { RouterLink } from 'vue-router';

const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'));
const items = ref<any[]>([]);
const stats = ref({
  currentlyLost: 0,
  foundToday: 0,
  returnedAllTime: 0
});

const fetchStats = async () => {
  try {
    const apiUrl = (import.meta as any).env.VITE_API_URL;
    const response = await axios.get(`${apiUrl}/api/stats`);
    stats.value = response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

const fetchItems = async () => {
  try {
    const apiUrl = (import.meta as any).env.VITE_API_URL;
    const response = await axios.get(`${apiUrl}/api/items`);
    items.value = response.data;
  } catch (error) {
    console.error('Error fetching items:', error);
  }
};

onMounted(() => {
  fetchStats();
  fetchItems();
});

const formatDate = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
};
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- SideNavBar -->
    <aside class="h-screen w-64 fixed left-0 top-0 bg-surface shadow-sm z-50 overflow-y-auto hidden md:block">
      <div class="flex flex-col h-full py-8 px-4">
        <div class="mb-10 px-4">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
              <span class="material-symbols-outlined text-white">domain</span>
            </div>
            <div>
              <h1 class="text-headline-sm font-bold text-primary">Lost & Found</h1>
              <p class="text-label-sm text-on-surface-variant">Digital Concierge</p>
            </div>
          </div>
        </div>
        <nav class="flex-1 space-y-1">
          <RouterLink to="/dashboard" class="flex items-center gap-3 px-4 py-3 text-primary border-r-4 border-primary font-bold bg-primary-container/10 transition-all duration-200">
            <span class="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </RouterLink>
          <RouterLink to="/report" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200">
            <span class="material-symbols-outlined">report</span>
            <span>Lapor</span>
          </RouterLink>
          <a href="#" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200">
            <span class="material-symbols-outlined">search</span>
            <span>Pencarian</span>
          </a>
          <a href="#" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors duration-200">
            <span class="material-symbols-outlined">leaderboard</span>
            <span>Statistik</span>
          </a>
        </nav>
        <div class="mt-auto px-4">
          <RouterLink to="/report" class="w-full py-3 px-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-sm active:scale-95">
            <span class="material-symbols-outlined text-[20px]">add</span>
            Report Found Item
          </RouterLink>
        </div>
      </div>
    </aside>

    <!-- TopNavBar -->
    <header class="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-16 bg-surface/80 backdrop-blur-md shadow-sm z-40">
      <div class="flex justify-between items-center px-8 w-full h-full">
        <div class="flex items-center gap-4 w-full max-w-md">
          <div class="relative w-full focus-within:ring-2 focus-within:ring-primary rounded-lg transition-all">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input type="text" placeholder="Search for items..." class="w-full bg-surface-container-low border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-0" />
          </div>
        </div>
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-4">
            <button class="text-on-surface-variant hover:text-primary transition-colors">
              <span class="material-symbols-outlined">notifications</span>
            </button>
          </div>
          <div class="h-8 w-[1px] bg-outline-variant mx-2"></div>
          <div class="flex items-center gap-3">
            <div class="text-right hidden lg:block">
              <p class="text-label-md font-bold text-on-surface">{{ user.nama || 'Alex Rivera' }}</p>
              <p class="text-label-sm text-on-surface-variant">Student ({{ user.nis || '220104' }})</p>
            </div>
            <div class="w-10 h-10 rounded-full border-2 border-primary/20 bg-primary-container/20 flex items-center justify-center overflow-hidden text-primary font-bold">
              {{ user.nama ? user.nama.charAt(0) : 'A' }}
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="md:ml-64 pt-24 px-8 pb-12 min-h-screen max-w-[1200px] mx-auto">
      <!-- Welcome Banner -->
      <section class="mb-10">
        <div class="relative overflow-hidden rounded-3xl bg-primary-container p-10 text-white flex justify-between items-center shadow-md">
          <div class="relative z-10 max-w-xl">
            <h2 class="text-4xl font-bold mb-4 text-on-primary-container">Welcome back, {{ user.nama ? user.nama.split(' ')[0] : 'Alex' }}!</h2>
            <p class="text-lg text-on-primary-container/90 mb-8">Lost something on campus? Our digital concierge is here to help you find your belongings and reconnect with what matters.</p>
            <div class="flex gap-4">
              <button class="px-6 py-3 bg-white text-primary rounded-xl font-bold hover:bg-surface-container-high transition-all shadow-sm">View My Items</button>
              <button class="px-6 py-3 bg-primary/20 border border-white/30 text-white backdrop-blur-sm rounded-xl font-bold hover:bg-primary/30 transition-all">How it works</button>
            </div>
          </div>
          <div class="absolute right-0 top-0 h-full w-1/3 opacity-20 flex items-center justify-center pointer-events-none">
            <span class="material-symbols-outlined text-[240px]">inventory_2</span>
          </div>
        </div>
      </section>

      <!-- Stats Bento Grid -->
      <section class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
          <div class="w-14 h-14 rounded-full bg-error-container/20 flex items-center justify-center text-error">
            <span class="material-symbols-outlined text-3xl">search</span>
          </div>
          <div>
            <p class="text-sm text-on-surface-variant font-medium">Currently Lost</p>
            <h3 class="text-2xl font-bold text-on-surface">{{ stats.currentlyLost }} Items</h3>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
          <div class="w-14 h-14 rounded-full bg-primary-fixed/20 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-3xl">check_circle</span>
          </div>
          <div>
            <p class="text-sm text-on-surface-variant font-medium">Found Today</p>
            <h3 class="text-2xl font-bold text-on-surface">{{ stats.foundToday }} Items</h3>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
          <div class="w-14 h-14 rounded-full bg-tertiary-container/10 flex items-center justify-center text-tertiary">
            <span class="material-symbols-outlined text-3xl">handshake</span>
          </div>
          <div>
            <p class="text-sm text-on-surface-variant font-medium">Returned All-time</p>
            <h3 class="text-2xl font-bold text-on-surface">{{ stats.returnedAllTime.toLocaleString() }} Items</h3>
          </div>
        </div>
      </section>

      <!-- Action Cards Grid -->
      <section class="mb-12">
        <h3 class="text-2xl font-bold mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">bolt</span>
          Quick Actions
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <RouterLink to="/report" class="bg-white rounded-3xl p-8 border border-outline-variant shadow-sm hover:shadow-md transition-all group cursor-pointer border-l-8 border-l-primary">
            <span class="material-symbols-outlined text-5xl text-primary mb-6 group-hover:scale-110 transition-transform">find_in_page</span>
            <h4 class="text-xl font-bold mb-2">Report Lost</h4>
            <p class="text-on-surface-variant mb-6">Misplaced something? Let the community know so we can help find it.</p>
            <div class="flex items-center text-primary font-bold gap-2 group-hover:gap-3 transition-all">
              Start Report <span class="material-symbols-outlined">arrow_forward</span>
            </div>
          </RouterLink>
          <RouterLink to="/report" class="bg-white rounded-3xl p-8 border border-outline-variant shadow-sm hover:shadow-md transition-all group cursor-pointer border-l-8 border-l-tertiary">
            <span class="material-symbols-outlined text-5xl text-tertiary mb-6 group-hover:scale-110 transition-transform">add_a_photo</span>
            <h4 class="text-xl font-bold mb-2">Report Found</h4>
            <p class="text-on-surface-variant mb-6">Found someone's property? Secure it and log the details here.</p>
            <div class="flex items-center text-tertiary font-bold gap-2 group-hover:gap-3 transition-all">
              Log Item <span class="material-symbols-outlined">arrow_forward</span>
            </div>
          </RouterLink>
          <div class="bg-white rounded-3xl p-8 border border-outline-variant shadow-sm hover:shadow-md transition-all group cursor-pointer border-l-8 border-l-secondary-container">
            <span class="material-symbols-outlined text-5xl text-on-secondary-container mb-6 group-hover:scale-110 transition-transform">qr_code_2</span>
            <h4 class="text-xl font-bold mb-2">Scan to Claim</h4>
            <p class="text-on-surface-variant mb-6">At the concierge desk? Scan the QR code on the item to verify ownership.</p>
            <div class="flex items-center text-on-secondary-container font-bold gap-2 group-hover:gap-3 transition-all">
              Open Scanner <span class="material-symbols-outlined">arrow_forward</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Recent Items -->
      <section>
        <div class="flex justify-between items-end mb-8">
          <div>
            <h3 class="text-2xl font-bold">Recent Items</h3>
            <p class="text-on-surface-variant">Newly reported items in the school ecosystem</p>
          </div>
          <a href="#" class="text-primary font-bold flex items-center gap-1 hover:underline">
            View Gallery <span class="material-symbols-outlined">open_in_new</span>
          </a>
        </div>
        
        <div v-if="items.length === 0" class="text-center py-20 bg-white rounded-3xl border border-dashed border-outline-variant">
          <span class="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-4">inventory_2</span>
          <p class="text-on-surface-variant">No items reported yet.</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="item in items" :key="item._id" class="bg-white rounded-2xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-md transition-all group">
            <div class="relative h-48 w-full overflow-hidden">
              <img :src="item.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute top-3 left-3 flex gap-2">
                <span :class="['text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded shadow-sm', 
                  item.type === 'Lost' ? 'bg-error text-white' : 'bg-primary text-white']">
                  {{ item.type }}
                </span>
                <span class="bg-white/90 backdrop-blur-sm text-on-surface text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                  {{ item.category }}
                </span>
              </div>
            </div>
            <div class="p-5">
              <h4 class="font-bold mb-1 truncate">{{ item.name }}</h4>
              <p class="text-xs text-on-surface-variant flex items-center gap-1 mb-4">
                <span class="material-symbols-outlined text-[14px]">location_on</span>
                {{ item.location }}
              </p>
              <div class="flex items-center justify-between">
                <span :class="['text-[10px] px-3 py-1 rounded-full font-bold', 
                  item.status === 'Available' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : 'bg-secondary-fixed text-on-secondary-fixed-variant']">
                  {{ item.status }}
                </span>
                <span class="text-[10px] text-on-surface-variant">{{ formatDate(item.reportedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.bg-primary-fixed\/20 { background-color: rgba(163, 246, 156, 0.2); }
.bg-tertiary-fixed { background-color: #abf4ac; }
.text-on-tertiary-fixed-variant { color: #07521d; }
.bg-secondary-fixed { background-color: #dee5d6; }
.text-on-secondary-fixed-variant { color: #42493e; }
</style>
