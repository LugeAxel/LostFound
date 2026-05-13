<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import "leaflet/dist/leaflet.css";
import * as L from 'leaflet';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';

import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '@/config/api';

const route = useRoute();
const router = useRouter();
const itemId = route.params.id as string;

const item = ref<any>(null);
const isLoading = ref(true);
const mapContainer = ref<HTMLElement | null>(null);
const mapInstance = ref<L.Map | null>(null);

const newMessage = ref('');
const isSending = ref(false);
const currentUser = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'));
let socket: any = null;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchItem = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/items/${itemId}`, { headers: getAuthHeaders() });
    item.value = res.data;
    
    // Set loading to false so the v-else-if="item" block (with map container) renders
    isLoading.value = false;
    
    // Wait for Vue to render the map container
    await nextTick();
    
    if (item.value && item.value.coordinates?.latitude != null && item.value.coordinates?.longitude != null) {
      initMap();
    }
    
    scrollToBottom();
  } catch (error) {
    console.error('Error fetching item:', error);
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchItem();
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true
  });
  
  socket.on('connect', () => {
    socket.emit('join-item', itemId);
  });

  socket.on('new-message', (data: any) => {
    if (data.itemId === itemId && item.value) {
      // Avoid duplicates if we just sent it
      const exists = item.value.messages.some((m: any) => m._id === data.message._id);
      if (!exists) {
        item.value.messages.push(data.message);
        scrollToBottom();
      }
    }
  });
});

onBeforeUnmount(() => {
  if (socket) socket.disconnect();
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }
});

const startClaim = async () => {
  try {
    await axios.post(`${API_URL}/api/items/${itemId}/start-claim`, {}, { headers: getAuthHeaders() });
    await fetchItem();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Failed to start claim');
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  isSending.value = true;
  try {
    const res = await axios.post(`${API_URL}/api/items/${itemId}/chat`, { text: newMessage.value }, { headers: getAuthHeaders() });
    item.value.messages = res.data.messages;
    newMessage.value = '';
    scrollToBottom();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Failed to send message');
  } finally {
    isSending.value = false;
  }
};

const fileComplaint = async () => {
  const reason = prompt('Please describe why you are filing a complaint:');
  if (!reason) return;
  try {
    await axios.post(`${API_URL}/api/items/${itemId}/complaint`, { reason }, { headers: getAuthHeaders() });
    alert('Complaint filed successfully');
    await fetchItem();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Failed to file complaint');
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  });
};

const isFounder = () => item.value?.reporter?._id === currentUser.value?._id;
const isClaimer = () => item.value?.claimer === currentUser.value?._id || item.value?.claimer?._id === currentUser.value?._id;

const resolveClaim = async (userId: string) => {
  if (!confirm('Are you sure you want to resolve this claim to this student?')) return;
  try {
    await axios.post(`${API_URL}/api/items/${itemId}/resolve`, { userId }, { headers: getAuthHeaders() });
    alert('Claim resolved successfully');
    await fetchItem();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Failed to resolve claim');
  }
};

const initMap = async () => {
  if (!item.value?.coordinates || !mapContainer.value) return;
  
  // Guard against double-init by removing any existing instance first
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }

  const { latitude, longitude } = item.value.coordinates;
  const map = L.map(mapContainer.value).setView([latitude, longitude], 16);
  mapInstance.value = map;
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const customIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#1aff00" d="M12 2c-4.41 0-8 3.59-8 8c-.03 6.44 7.12 11.6 7.42 11.82c.17.12.38.19.58.19s.41-.06.58-.19c.3-.22 7.45-5.37 7.42-11.82c0-4.41-3.59-8-8-8m0 12c-2.21 0-4-1.79-4-4s1.79-4 4-4s4 1.79 4 4s-1.79 4-4 4" stroke-width="0.5" stroke="#000"/></svg>`,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  L.marker([latitude, longitude], { icon: customIcon }).addTo(map)
    .bindPopup(item.value.name)
    .openPopup();

  // Ensure map tiles are sized correctly after first paint
  await nextTick();
  map.invalidateSize();
  
  // Robustness: additional invalidations for slow flex layouts
  setTimeout(() => map.invalidateSize(), 100);
  setTimeout(() => map.invalidateSize(), 400);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};


</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] flex font-sans">
    <SideNav />
    <TopNav />

    <main class="md:ml-64 pt-16 flex-1 flex flex-col overflow-hidden">
      <!-- Item specific header below TopNav -->
      <header class="bg-white/60 backdrop-blur-md border-b border-[#e0e4df] px-8 py-4 sticky top-3 z-30">
        <div class="flex items-center justify-between">
        <button @click="router.back()" class="flex items-center gap-2 text-[#40493d] hover:text-[#387b41] font-bold text-sm transition-all group">
          <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Back
        </button>
        <div class="flex gap-2">
          <span :class="['text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider', 
            item?.type === 'lost' ? 'bg-[#fef2f2] text-[#ba1a1a]' : 'bg-[#f0fdf4] text-[#387b41]']">
            {{ item?.type }}
          </span>
          <span :class="['text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider', 
            item?.status === 'Available' ? 'bg-[#abf4ac] text-[#07521d]' : 
            item?.status === 'On Progress' ? 'bg-[#ffecb3] text-[#f57f17]' : 'bg-[#dee5d6] text-[#42493e]']">
            {{ item?.status }}
          </span>
        </div>
      </div>
    </header>

      <div class="flex-1 max-w-[1200px] w-full mx-auto p-6 md:p-10 space-y-10 overflow-y-auto">
      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
      </div>

      <div v-else-if="item" class="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <!-- Left: Images and Description -->
        <div class="space-y-8">
          <div class="bg-white rounded-[2.5rem] overflow-hidden border border-[#e0e4df] shadow-sm">
            <div class="aspect-video relative bg-[#f3f5f2] flex items-center justify-center">
              <img v-if="item.imageUrl" :src="item.imageUrl" class="w-full h-full object-cover" />
              <span v-else class="material-symbols-outlined text-7xl text-[#40493d]/20">{{ item.type === 'lost' ? 'search' : 'inventory_2' }}</span>
            </div>
            <div class="p-8">
              <h1 class="text-3xl font-bold text-[#1c1b1b] mb-4">{{ item.name }}</h1>
              <p class="text-[#40493d] leading-relaxed mb-6">{{ item.description || 'No description provided.' }}</p>
              
              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-[#f3f5f2] rounded-2xl">
                  <p class="text-[10px] font-bold text-[#40493d] uppercase tracking-wider mb-1">Category</p>
                  <p class="text-sm font-bold text-[#1c1b1b]">{{ item.category }}</p>
                </div>
                <div class="p-4 bg-[#f3f5f2] rounded-2xl">
                  <p class="text-[10px] font-bold text-[#40493d] uppercase tracking-wider mb-1">Reported At</p>
                  <p class="text-sm font-bold text-[#1c1b1b]">{{ formatDate(item.reportedAt) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Reporter Info -->
          <div class="bg-white rounded-3xl p-6 border border-[#e0e4df] flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-[#f0fdf4] border-2 border-[#387b41]/20 flex items-center justify-center">
                <span class="text-[#387b41] font-bold text-xl">{{ (item.reporter?.nama || 'S').charAt(0) }}</span>
              </div>
              <div>
                <p class="text-[10px] font-bold text-[#40493d] uppercase tracking-wider">Reported By</p>
                <p class="text-sm font-bold text-[#1c1b1b]">{{ item.reporter?.nama || 'Anonymous' }}</p>
              </div>
            </div>
            <div v-if="item.status === 'Returned' && item.claimer" class="text-right">
              <p class="text-[10px] font-bold text-[#387b41] uppercase tracking-wider ">Claimed By</p>
              <p class="text-sm font-bold text-[#1c1b1b]">{{ item.claimer.nama }}</p>
            </div>
            <div v-else-if="item.status === 'On Progress' && item.claimer" class="text-right">
              <p class="text-[10px] font-bold text-[#f57f17] uppercase tracking-wider">Being Claimed By</p>
              <p class="text-sm font-bold text-[#1c1b1b]">{{ typeof item.claimer === 'object' ? item.claimer.nama : 'Another Student' }}</p>
            </div>
          </div>

          <!-- Chat System (Only for Founder and Claimer) -->
          <div v-if="(item.status === 'On Progress' || item.status === 'Returned') && (isFounder() || isClaimer())" 
            class="bg-white rounded-[2rem] border border-[#e0e4df] shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div class="p-4 border-b border-[#e0e4df] bg-[#f8faf7] flex items-center gap-2">
              <span class="material-symbols-outlined text-[#387b41]">forum</span>
              <h3 class="font-bold text-sm text-[#1c1b1b]">Chat with {{ isFounder() ? 'Claimer' : 'Founder' }}</h3>
            </div>
            
            <div id="chat-container" class="flex-1 overflow-y-auto p-4 space-y-4">
              <div v-for="msg in item.messages" :key="msg._id" 
                :class="['flex flex-col max-w-[80%]', msg.sender === currentUser._id ? 'ml-auto items-end' : 'mr-auto items-start']">
                <div :class="['px-4 py-2 rounded-2xl text-sm font-medium shadow-sm', 
                  msg.sender === currentUser._id ? 'bg-[#387b41] text-white rounded-tr-none' : 'bg-[#f3f5f2] text-[#1c1b1b] rounded-tl-none']">
                  {{ msg.text }}
                </div>
                <span class="text-[8px] text-[#40493d] mt-1">{{ formatDate(msg.timestamp) }}</span>
              </div>
              <div v-if="!item.messages?.length" class="h-full flex items-center justify-center text-[#40493d]/40 text-xs italic">
                No messages yet. Start the conversation!
              </div>
            </div>

            <form @submit.prevent="sendMessage" class="p-4 border-t border-[#e0e4df] flex gap-2">
              <input v-model="newMessage" type="text" placeholder="Type a message..." 
                class="flex-1 bg-[#f3f5f2] border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#387b41] outline-none" />
              <button type="submit" :disabled="isSending" 
                class="w-10 h-10 bg-[#387b41] text-white rounded-xl flex items-center justify-center hover:bg-[#2d6334] transition-all disabled:opacity-50">
                <span class="material-symbols-outlined">{{ isSending ? 'sync' : 'send' }}</span>
              </button>
            </form>
          </div>

          <!-- Resolution System (Only for Founder) -->
          <div v-if="isFounder() && (item.status === 'On Progress' || (item.status === 'Returned' && item.complaints?.length > 0))" 
            class="bg-white rounded-[2rem] border border-[#e0e4df] shadow-sm p-8 space-y-6">
            <h3 class="text-lg font-bold text-[#1c1b1b]">Finalize Ownership</h3>
            <p class="text-xs text-[#40493d] mb-4">Choose the correct owner for this item. This will permanently mark the item as returned to this student.</p>
            
            <div class="space-y-4">
              <!-- Original Claimer -->
              <div v-if="item.claimer" class="p-4 bg-[#f0fdf4] rounded-2xl flex items-center justify-between border border-[#387b41]/20">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-[#387b41] text-white flex items-center justify-center text-xs font-bold">C</div>
                  <div>
                    <p class="text-xs font-bold text-[#1c1b1b]">{{ typeof item.claimer === 'object' ? item.claimer.nama : 'Original Claimer' }}</p>
                    <p class="text-[10px] text-[#387b41]">Claimer</p>
                  </div>
                </div>
                <button @click="resolveClaim(typeof item.claimer === 'object' ? item.claimer._id : item.claimer)" 
                  class="px-4 py-2 bg-[#387b41] text-white rounded-lg text-xs font-bold hover:bg-[#2d6334] transition-all">
                  Confirm
                </button>
              </div>

              <!-- Complainers -->
              <div v-for="complaint in item.complaints" :key="complaint._id" 
                class="p-4 bg-red-50 rounded-2xl flex items-center justify-between border border-red-100">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">P</div>
                  <div>
                    <p class="text-xs font-bold text-[#1c1b1b]">{{ complaint.user?.nama || 'Another Student' }}</p>
                    <p class="text-[10px] text-red-600">Complained: "{{ complaint.reason }}"</p>
                  </div>
                </div>
                <button @click="resolveClaim(complaint.user?._id || complaint.user)" 
                  class="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Map and Location Details -->
        <div class="space-y-8">
          <div class="bg-white rounded-[2.5rem] overflow-hidden border border-[#e0e4df] shadow-sm flex flex-col h-full min-h-[500px]">
            <div class="p-8 border-b border-[#e0e4df]">
              <h2 class="text-xl font-bold text-[#1c1b1b] flex items-center gap-2">
                <span class="material-symbols-outlined text-[#387b41]">location_on</span>
                Location Details
              </h2>
              <p class="text-sm text-[#40493d] mt-1">{{ item.location }}</p>
            </div>
            
            <div v-if="item.coordinates?.latitude != null && item.coordinates?.longitude != null" ref="mapContainer" class="flex-1 w-full min-h-[300px]"></div>
            <div v-else class="flex-1 bg-[#f3f5f2] flex flex-col items-center justify-center text-center p-10 space-y-4">
              <span class="material-symbols-outlined text-5xl text-[#40493d]/20">map</span>
              <p class="text-sm text-[#40493d] max-w-[200px]">No precise GPS coordinates available for this item.</p>
            </div>

            <div class="p-8 bg-[#fcf9f8] border-t border-[#e0e4df] space-y-4">
              <h3 class="text-sm font-bold text-[#1c1b1b] mb-2">How to collect?</h3>
              <p class="text-xs text-[#40493d] leading-relaxed">
                If you are the owner of this item, please visit the location mentioned above or contact the school concierge with the claim QR code found in your profile.
              </p>
              
              <!-- Claim Button for Available items -->
              <button v-if="item.status === 'Available' && !isFounder()" 
                @click="startClaim"
                class="w-full py-4 bg-[#387b41] text-white rounded-2xl font-bold text-base shadow-lg hover:bg-[#2d6334] active:scale-95 transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined">pan_tool</span>
                Claim This Item
              </button>
              <div v-else-if="item.status === 'On Progress'" class="p-4 bg-[#ffecb3] rounded-2xl flex items-start gap-3">
                <span class="material-symbols-outlined text-[#f57f17]">info</span>
                <p class="text-xs text-[#5f4339] font-medium leading-relaxed">
                  This item is currently being claimed. The founder and claimer are communicating.
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

<style scoped>
:deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  z-index: 10;
}

:deep(.custom-marker-icon) {
  background: none !important;
  border: none !important;
}
</style>
