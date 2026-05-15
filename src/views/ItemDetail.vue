<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import "leaflet/dist/leaflet.css";
import * as L from 'leaflet';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import { useI18n } from '../i18n';
import { useToast } from '../composables/useToast';

import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '@/config/api';

const route = useRoute();
const router = useRouter();
const itemId = route.params.id as string;

const item = ref<any>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const mapContainer = ref<HTMLElement | null>(null);
const mapInstance = ref<L.Map | null>(null);

const newMessage = ref('');
const isSending = ref(false);
const currentUser = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'));
const { t } = useI18n();
const toast = useToast();
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
  } catch (error: any) {
    console.error('Error fetching item:', error);
    if (error.response?.status === 404) {
      errorMessage.value = 'not_found';
    } else {
      errorMessage.value = 'error';
    }
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchItem();
  const token = localStorage.getItem('token');
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: { token }
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
    toast.show(error.response?.data?.message || 'Failed to start claim', 'error');
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
    toast.show(error.response?.data?.message || 'Failed to send message', 'error');
  } finally {
    isSending.value = false;
  }
};

const showComplaintModal = ref(false);
const complaintReason = ref('');

const fileComplaint = () => {
  complaintReason.value = '';
  showComplaintModal.value = true;
};

const submitComplaint = async () => {
  if (!complaintReason.value.trim()) return;
  try {
    await axios.post(`${API_URL}/api/items/${itemId}/complaint`, { reason: complaintReason.value }, { headers: getAuthHeaders() });
    toast.show(t('detail.complaint_success'), 'success');
    showComplaintModal.value = false;
    complaintReason.value = '';
    await fetchItem();
  } catch (error: any) {
    toast.show(error.response?.data?.message || t('detail.complaint_success'), error.response?.data?.message ? 'error' : 'success');
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
const hasComplained = () => item.value?.complaints?.some((c: any) => c.user?._id === currentUser.value?._id);

const assignClaimer = async (userId: string) => {
  if (!confirm('Are you sure you want to set this student as the claimer?')) return;
  try {
    await axios.post(`${API_URL}/api/items/${itemId}/resolve`, { userId }, { headers: getAuthHeaders() });
    toast.show(t('detail.claimer_reassigned'), 'success');
    await fetchItem();
  } catch (error: any) {
    toast.show(error.response?.data?.message || 'Failed to assign claimer', 'error');
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

const copyGps = async (lat: number, lng: number) => {
  const text = `${lat},${lng}`;
  try {
    await navigator.clipboard.writeText(text);
    toast.show('GPS coordinates copied', 'success');
  } catch {
    toast.show('Failed to copy', 'error');
  }
};


</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex font-sans pb-20">
    <SideNav />
    <TopNav />

    <main class="md:ml-64 pt-13 flex-1 flex flex-col overflow-hidden">
      <!-- Item specific header below TopNav -->
      <header class="bg-white dark:bg-[#1e1e1e]/60 backdrop-blur-md border-b border-[#e0e4df] dark:border-[#374151] px-8 py-4 sticky top-3 z-30">
        <div class="flex items-center justify-between">
        <button @click="router.back()" class="flex items-center gap-2 text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] font-bold text-sm transition-all group">
          <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          {{ t('detail.back') }}
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

      <div class="flex-1 max-w-[1200px] w-full mx-auto p-4 md:p-6 md:p-10 space-y-10 overflow-y-auto">
      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
      </div>

      <div v-else-if="errorMessage" class="flex flex-col items-center justify-center py-24 text-center px-4">
        <div class="w-24 h-24 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mb-6">
          <span class="material-symbols-outlined text-5xl text-[#40493d] dark:text-[#9ca3af]">inventory_2</span>
        </div>
        <h3 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-3">Item Not Found</h3>
        <p class="text-[#40493d] dark:text-[#9ca3af] max-w-md text-sm mb-8 leading-relaxed">
          This item may have been returned and removed, or it no longer exists in the system.
        </p>
        <button @click="router.push('/dashboard')"
          class="px-8 py-3 bg-[#387b41] text-white rounded-xl font-bold hover:bg-[#2d6334] transition-all active:scale-95 shadow-sm">
          Back to Dashboard
        </button>
      </div>

      <div v-else-if="item" class="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <!-- Left: Images and Description -->
        <div class="space-y-8">
          <div class="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] overflow-hidden border border-[#e0e4df] dark:border-[#374151] shadow-sm">
            <div class="aspect-video relative bg-[#f3f5f2] dark:bg-[#2a2a2a] flex items-center justify-center">
              <img v-if="item.imageUrl" :src="item.imageUrl" class="w-full h-full object-cover" />
              <span v-else class="material-symbols-outlined text-7xl text-[#40493d] dark:text-[#9ca3af]/20">{{ item.type === 'lost' ? 'search' : 'inventory_2' }}</span>
            </div>
            <div class="p-8">
              <h1 class="text-3xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-4">{{ item.name }}</h1>
              <p class="text-[#40493d] dark:text-[#9ca3af] leading-relaxed mb-6">{{ item.description || t('detail.no_description') }}</p>
              
              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-2xl">
                  <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider mb-1">{{ t('detail.category') }}</p>
                  <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ item.category }}</p>
                </div>
                <div class="p-4 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-2xl">
                  <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider mb-1">{{ t('detail.reported_at') }}</p>
                  <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ formatDate(item.reportedAt) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Reporter Info -->
          <div class="bg-white dark:bg-[#1e1e1e] rounded-3xl p-4 md:p-6 border border-[#e0e4df] dark:border-[#374151] flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-[#f0fdf4] border-2 border-[#387b41]/20 flex items-center justify-center">
                <span class="text-[#387b41] font-bold text-xl">{{ (item.reporter?.nama || 'S').charAt(0) }}</span>
              </div>
              <div>
                <p class="text-[10px] font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider">{{ t('detail.reported_by') }}</p>
                <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ item.reporter?.nama || 'Anonymous' }}</p>
              </div>
            </div>
            <div v-if="item.status === 'Returned' && item.claimer" class="text-right">
              <p class="text-[10px] font-bold text-[#387b41] uppercase tracking-wider ">{{ t('detail.claimed_by') }}</p>
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ item.claimer.nama }}</p>
            </div>
            <div v-else-if="item.status === 'On Progress' && item.claimer" class="text-right">
              <p class="text-[10px] font-bold text-[#f57f17] uppercase tracking-wider">{{ t('detail.being_claimed_by') }}</p>
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ typeof item.claimer === 'object' ? item.claimer.nama : 'Another Student' }}</p>
            </div>
          </div>

          <!-- Chat System (Only for Founder and Claimer) -->
          <div v-if="(item.status === 'On Progress' || item.status === 'Returned') && (isFounder() || isClaimer())" 
            class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] border border-[#e0e4df] dark:border-[#374151] shadow-sm overflow-hidden flex flex-col h-[300px] md:h-[400px]">
            <div class="p-4 border-b border-[#e0e4df] dark:border-[#374151] bg-[#f8faf7] dark:bg-[#121212] flex items-center gap-2">
              <span class="material-symbols-outlined text-[#387b41]">forum</span>
              <h3 class="font-bold text-sm text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t('detail.chat_with') }} {{ isFounder() ? t('detail.claimer_label') : 'Founder' }}</h3>
            </div>
            
            <div id="chat-container" class="flex-1 overflow-y-auto p-4 space-y-4">
              <div v-for="msg in item.messages" :key="msg._id" 
                :class="['flex flex-col max-w-[80%]', msg.sender === currentUser._id ? 'ml-auto items-end' : 'mr-auto items-start']">
                <div :class="['px-4 py-2 rounded-2xl text-sm font-medium shadow-sm', 
                  msg.sender === currentUser._id ? 'bg-[#387b41] text-white rounded-tr-none' : 'bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#1c1b1b] dark:text-[#f3f4f6] rounded-tl-none']">
                  {{ msg.text }}
                </div>
                <span class="text-[8px] text-[#40493d] dark:text-[#9ca3af] mt-1">{{ formatDate(msg.timestamp) }}</span>
              </div>
              <div v-if="!item.messages?.length" class="h-full flex items-center justify-center text-[#40493d] dark:text-[#9ca3af]/40 text-xs italic">
                {{ t('detail.no_messages') }}
              </div>
            </div>

            <form @submit.prevent="sendMessage" class="p-4 border-t border-[#e0e4df] dark:border-[#374151] flex gap-2">
              <input v-model="newMessage" type="text" :placeholder="t('detail.chat_placeholder')" 
                class="flex-1 bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#387b41] outline-none" />
              <button type="submit" :disabled="isSending" 
                class="w-10 h-10 bg-[#387b41] text-white rounded-xl flex items-center justify-center hover:bg-[#2d6334] transition-all disabled:opacity-50">
                <span class="material-symbols-outlined">{{ isSending ? 'sync' : 'send' }}</span>
              </button>
            </form>
          </div>

          <!-- Assign Claimer System (Only for Founder) — Only reassigns, no permanent Returned -->
          <div v-if="isFounder() && (item.status === 'On Progress')" 
            class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] border border-[#e0e4df] dark:border-[#374151] shadow-sm p-4 md:p-8 space-y-6">
            <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t('detail.assign_claimer') }}</h3>
            <p class="text-xs text-[#40493d] dark:text-[#9ca3af] mb-4">{{ t('detail.assign_claimer_desc') }}</p>
            
            <div class="p-3 bg-[#ffecb3] rounded-2xl flex items-start gap-3 mb-4">
              <span class="material-symbols-outlined text-[#f57f17] text-sm shrink-0">info</span>
              <p class="text-[10px] text-[#5f4339] font-medium leading-relaxed">{{ t('detail.meet_scan_notice') }}</p>
            </div>

            <div class="space-y-4">
              <!-- Original Claimer -->
              <div v-if="item.claimer" class="p-4 bg-[#f0fdf4] rounded-2xl flex items-center justify-between border border-[#387b41]/20">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-[#387b41] text-white flex items-center justify-center text-xs font-bold">C</div>
                  <div>
                    <p class="text-xs font-bold text-[#1c1b1b]">{{ typeof item.claimer === 'object' ? item.claimer.nama : t('detail.original_claimer') }}</p>
                    <p class="text-[10px] text-[#387b41]">{{ t('detail.claimer_label') }}</p>
                  </div>
                </div>
                <span class="px-4 py-2 bg-[#387b41]/10 text-[#387b41] rounded-lg text-xs font-bold flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  {{ t('detail.original_claimer') }}
                </span>
              </div>

              <!-- Complainers -->
              <div v-for="complaint in item.complaints" :key="complaint._id" 
                class="p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl flex items-center justify-between border border-red-100 dark:border-red-900/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">P</div>
                  <div>
                    <p class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ complaint.user?.nama || 'Another Student' }}</p>
                    <p class="text-[10px] text-red-600 dark:text-red-400">{{ t('detail.complained_label') }} "{{ complaint.reason }}"</p>
                  </div>
                </div>
                <button @click="assignClaimer(complaint.user?._id || complaint.user)" 
                  class="px-4 py-2 bg-[#387b41] text-white rounded-lg text-xs font-bold hover:bg-[#2d6334] transition-all">
                  {{ t('detail.set_claimer') }}
                </button>
              </div>

              <div v-if="!item.complaints?.length" class="text-center py-4 text-[#40493d] dark:text-[#9ca3af] text-xs italic">
                No complaints filed yet.
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Map and Location Details -->
        <div class="space-y-8">
          <div class="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] overflow-hidden border border-[#e0e4df] dark:border-[#374151] shadow-sm flex flex-col h-180 min-h-[350px] md:min-h-[500px]">
            <div class="p-6 md:p-8 border-b border-[#e0e4df] dark:border-[#374151]">
              <h2 class="text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] flex items-center gap-2">
                <span class="material-symbols-outlined text-[#387b41]">location_on</span>
                {{ t('detail.location_details') }}
              </h2>
              <p class="text-sm text-[#40493d] dark:text-[#9ca3af] mt-1">{{ item.location }}</p>
              <div v-if="item.coordinates?.latitude != null" class="mt-2 flex items-center gap-2">
                <span class="text-[10px] text-[#387b41] font-bold flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">gps_fixed</span>
                  {{ item.coordinates.latitude.toFixed(4) }}, {{ item.coordinates.longitude.toFixed(4) }}
                </span>
                <button @click="copyGps(item.coordinates.latitude, item.coordinates.longitude)"
                  class="text-[10px] text-[#387b41] hover:text-[#2d6334] font-bold flex items-center gap-0.5 transition-colors"
                  title="Copy GPS coordinates">
                  <span class="material-symbols-outlined text-xs">content_copy</span>
                </button>
              </div>
            </div>
            
            <div v-if="item.coordinates?.latitude != null && item.coordinates?.longitude != null" ref="mapContainer" class="flex-1 w-full min-h-[250px] md:min-h-[300px]"></div>
            <div v-else class="flex-1 bg-[#f3f5f2] dark:bg-[#2a2a2a] flex flex-col items-center justify-center text-center p-6 md:p-10 space-y-4">
              <span class="material-symbols-outlined text-5xl text-[#40493d] dark:text-[#9ca3af]/20">map</span>
              <p class="text-sm text-[#40493d] dark:text-[#9ca3af] max-w-[200px]">No precise GPS coordinates available for this item.</p>
            </div>

            <div class="p-6 md:p-8 bg-[#fcf9f8] dark:bg-[#1e1e1e] border-t border-[#e0e4df] dark:border-[#374151] space-y-4">
              <h3 class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2">{{ t('detail.how_to_collect') }}</h3>
              <p class="text-xs text-[#40493d] dark:text-[#9ca3af] leading-relaxed">
                {{ t('detail.how_to_collect_desc') }}
              </p>
              
              <!-- Claim Button for Available items -->
              <button v-if="item.status === 'Available' && !isFounder()" 
                @click="startClaim"
                class="w-full py-4 bg-[#387b41] text-white rounded-2xl font-bold text-base shadow-lg hover:bg-[#2d6334] active:scale-95 transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined">pan_tool</span>
                {{ t('detail.claim_this_item') }}
              </button>
              <div v-else-if="item.status === 'On Progress'" class="p-4 bg-[#ffecb3] rounded-2xl flex items-start gap-3">
                <span class="material-symbols-outlined text-[#f57f17]">info</span>
                <p class="text-xs text-[#5f4339] font-medium leading-relaxed">
                  {{ t('detail.in_progress_notice') }}
                </p>
              </div>

              <button v-if="item.status === 'On Progress' && !isFounder() && !isClaimer() && !hasComplained()"
                @click="fileComplaint"
                class="w-full py-4 bg-[#ba1a1a] text-white rounded-2xl font-bold text-base shadow-lg hover:bg-[#991515] active:scale-95 transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined">report</span>
                {{ t('detail.file_complaint') }}
              </button>
              <div v-else-if="item.status === 'On Progress' && !isFounder() && !isClaimer() && hasComplained()"
                class="p-4 bg-[#fef2f2] rounded-2xl flex items-start gap-3 border border-red-100">
                <span class="material-symbols-outlined text-[#ba1a1a] text-sm shrink-0">check_circle</span>
                <p class="text-xs text-[#ba1a1a] font-medium leading-relaxed">
                  {{ t('detail.complaint_already') }}
                </p>
              </div>

              <!-- Complaint Modal -->
              <Teleport to="body">
                <div v-if="showComplaintModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showComplaintModal = false">
                  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                  <div class="relative bg-white dark:bg-[#1e1e1e] rounded-[2rem] p-6 sm:p-8 w-full max-w-md border border-[#e0e4df] dark:border-[#374151] shadow-2xl animate-fade-in">
                    <div class="flex items-center gap-3 mb-6">
                      <div class="w-10 h-10 bg-[#fef2f2] rounded-xl flex items-center justify-center">
                        <span class="material-symbols-outlined text-[#ba1a1a]">report</span>
                      </div>
                      <div>
                        <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t('detail.complaint_modal_title') }}</h3>
                        <p class="text-xs text-[#40493d] dark:text-[#9ca3af]">{{ t('detail.complaint_modal_reason') }}</p>
                      </div>
                    </div>
                    <textarea v-model="complaintReason" :placeholder="t('detail.complaint_modal_placeholder')" rows="4" maxlength="500"
                      class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-2 border-transparent rounded-xl px-4 py-3 text-sm focus:border-[#ba1a1a] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all resize-none mb-4" />
                    <div class="flex gap-3">
                      <button @click="showComplaintModal = false"
                        class="flex-1 py-3 bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#40493d] dark:text-[#9ca3af] rounded-xl font-bold text-sm hover:bg-[#e0e4df] dark:hover:bg-[#374151] transition-all">
                        {{ t('detail.complaint_modal_cancel') }}
                      </button>
                      <button @click="submitComplaint" :disabled="!complaintReason.trim()"
                        class="flex-1 py-3 bg-[#ba1a1a] text-white rounded-xl font-bold text-sm hover:bg-[#991515] transition-all disabled:opacity-50">
                        {{ t('detail.complaint_modal_submit') }}
                      </button>
                    </div>
                  </div>
                </div>
              </Teleport>
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

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
</style>
