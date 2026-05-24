<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue';
import { useHead } from '@unhead/vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import "leaflet/dist/leaflet.css";
import * as L from 'leaflet';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import { useI18n } from '../i18n';
import { useToast } from '../composables/useToast';
import { getAuthHeaders, getCurrentUser } from '../composables/useAuth';
import { supabase } from '../lib/supabase';
import { optimizeImageUrl } from '../utils/cloudinary';
import { useRealtimeSingleItem } from '../composables/useRealtimeSingleItem';

import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '@/config/api';

const route = useRoute();
const router = useRouter();
const itemId = computed(() => route.params.id as string);

const item = ref<any>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const mapContainer = ref<HTMLElement | null>(null);
useHead({ title: () => item.value ? `${item.value.name} — QReturn` : 'QReturn' });
const mapInstance = ref<L.Map | null>(null);

const newMessage = ref('');
const isSending = ref(false);
const currentUser = ref<any>({});
const { t } = useI18n();
const toast = useToast();
let socket: any = null;

const onlineUserIds = ref<Set<string>>(new Set());
const activities = ref<any[]>([]);
const showActivities = ref(false);

useRealtimeSingleItem(itemId, () => {
  fetchItem();
});

const fetchItem = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/items/${itemId.value}`, { headers: await getAuthHeaders() });
    item.value = res.data;
    
    if (!item.value.messages) {
      item.value.messages = [];
    }
    item.value.item_images ??= [];
    selectedImageIndex.value = 0;
    
    fetchActivities();
    
    // Set loading to false so the v-else-if="item" block (with map container) renders
    isLoading.value = false;
    
    // Wait for Vue to render the map container
    await nextTick();
    
    if (item.value && item.value.coordinates_lat != null && item.value.coordinates_lng != null) {
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

const fetchOnlineUsers = async () => {
  try {
    const { data: ids } = await axios.get(`${API_URL}/api/online-users`, { headers: await getAuthHeaders() });
    onlineUserIds.value = new Set(ids || []);
  } catch { /* ignore */ }
};

const fetchActivities = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/items/${itemId.value}/activities`, { headers: await getAuthHeaders() });
    activities.value = res.data || [];
  } catch { /* ignore */ }
};

const isChatPartnerOnline = computed(() => {
  if (!item.value) return false;
  const partnerId = isFounder() ? item.value.claimer?.id : item.value.reporter?.id;
  return partnerId ? onlineUserIds.value.has(partnerId) : false;
});

const activityIcons: Record<string, string> = {
  item_created: 'add_circle',
  claim_started: 'pan_tool',
  message_sent: 'forum',
  complaint_filed: 'report',
  claimer_assigned: 'assignment_ind',
  item_returned: 'verified',
  item_edited: 'edit',
  claimer_removed: 'person_remove',
};

onMounted(async () => {
    const user = await getCurrentUser();
  if (user) currentUser.value = user;
  
  fetchItem();
  initSocket();
  fetchOnlineUsers();
});

const initSocket = async () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  socket = io(SOCKET_URL, {
    transports: ['polling'],
    withCredentials: true,
    auth: { token: session.access_token }
  });

  socket.on('connect', () => {
    socket.emit('join-item', itemId.value);
  });

  socket.on('new-message', (data: any) => {
    if (data.itemId !== itemId.value) return;
    if (!item.value) item.value = { messages: [] };
    if (!item.value.messages) item.value.messages = [];
    const exists = item.value.messages.some((m: any) => m.id === data.message.id);
    if (!exists) {
      item.value.messages.push(data.message);
      scrollToBottom();
    }
  });

  socket.on('user-online', (userId: string) => {
    onlineUserIds.value = new Set([...onlineUserIds.value, userId]);
  });

  socket.on('user-offline', (userId: string) => {
    const next = new Set(onlineUserIds.value);
    next.delete(userId);
    onlineUserIds.value = next;
  });

  socket.on('disconnect', (reason: string) => {
    if (reason === 'io server disconnect' || reason === 'io client disconnect') {
      initSocket();
    }
  });

  socket.on('connect_error', (err: any) => {
    console.error('Socket connection error:', err.message);
  });
};

watch(itemId, () => {
  isLoading.value = true;
  errorMessage.value = null;
  item.value = null;
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }
  fetchItem();
  initSocket();
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
    await axios.post(`${API_URL}/api/items/${itemId.value}/start-claim`, {}, { headers: await getAuthHeaders() });
    await fetchItem();
    toast.show('Claim started! Contact the reporter to arrange a meeting.', 'success');
  } catch (error: any) {
    toast.show(error.response?.data?.message || 'Failed to start claim', 'error');
    await fetchItem();
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  isSending.value = true;
  try {
    const res = await axios.post(`${API_URL}/api/items/${itemId.value}/chat`, { text: newMessage.value }, { headers: await getAuthHeaders() });
    if (res.data.messages?.[0] && item.value?.messages) {
      const exists = item.value.messages.some((m: any) => m.id === res.data.messages[0].id);
      if (!exists) item.value.messages.push(res.data.messages[0]);
    }
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
const hasFiledComplaint = ref(false);

const fileComplaint = () => {
  complaintReason.value = '';
  showComplaintModal.value = true;
};

const submitComplaint = async () => {
  const reason = complaintReason.value.trim();
  if (!reason) return;
  if (reason.length < 3) {
    toast.show(t('detail.complaint_min_length'), 'error');
    return;
  }
  hasFiledComplaint.value = true;
  showComplaintModal.value = false;
  try {
    await axios.post(`${API_URL}/api/items/${itemId.value}/complaint`, { reason: complaintReason.value }, { headers: await getAuthHeaders() });
    toast.show(t('detail.complaint_success'), 'success');
    complaintReason.value = '';
    await fetchItem();
  } catch (error: any) {
    toast.show(error.response?.data?.message || 'Failed to submit complaint', 'error');
    await fetchItem();
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  });
};

const isFounder = () => item.value?.reporter?.id === currentUser.value?.id;
const isClaimer = () => item.value?.claimer?.id === currentUser.value?.id;
const hasComplained = () => item.value?.complaints?.some((c: any) => c.user?.id === currentUser.value?.id);

const assignClaimer = async (userId: string) => {
  if (!confirm('Are you sure you want to set this student as the claimer?')) return;
  try {
    await axios.post(`${API_URL}/api/items/${itemId.value}/resolve`, { userId }, { headers: await getAuthHeaders() });
    toast.show(t('detail.claimer_reassigned'), 'success');
    await fetchItem();
  } catch (error: any) {
    toast.show(error.response?.data?.message || 'Failed to assign claimer', 'error');
  }
};

const initMap = async () => {
  if (item.value?.coordinates_lat == null || item.value?.coordinates_lng == null || !mapContainer.value) return;
  
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }

  const lat = item.value.coordinates_lat;
  const lng = item.value.coordinates_lng;
  const map = L.map(mapContainer.value).setView([lat, lng], 16);
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

  L.marker([lat, lng], { icon: customIcon }).addTo(map)
    .bindPopup(item.value.name)
    .openPopup();

  await nextTick();
  map.invalidateSize();
  
  setTimeout(() => map.invalidateSize(), 100);
  setTimeout(() => map.invalidateSize(), 400);
};

const selectedImageIndex = ref(0);

const allItemImages = computed(() => {
  if (!item.value) return [];
  const images: string[] = [];
  if (item.value.image_url) images.push(item.value.image_url);
  if (item.value.item_images) {
    for (const img of item.value.item_images) {
      if (img.image_url) images.push(img.image_url);
    }
  }
  return images;
});

const currentImage = computed(() => {
  const images = allItemImages.value;
  return images[selectedImageIndex.value] || images[0] || null;
});

const formatDate = (date: string) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { 
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

    <main class="md:ml-64 pt-12 flex-1 flex flex-col overflow-hidden">
      <!-- Item specific header below TopNav -->
      <header class="bg-white dark:bg-[#1e1e1e]/60 backdrop-blur-md border-b border-[#e0e4df] dark:border-[#374151] px-8 py-4 sticky top-2 z-30 mt-2">
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

      <div class="flex-1 w-full p-4 md:p-6 md:p-10 space-y-10 overflow-y-auto">
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
              <img v-if="currentImage" :src="optimizeImageUrl(currentImage)" class="w-full h-full object-cover" />
              <span v-else class="material-symbols-outlined text-7xl text-[#40493d] dark:text-[#9ca3af]/20">{{ item.type === 'lost' ? 'search' : 'inventory_2' }}</span>
            </div>
            <!-- Thumbnail strip -->
            <div v-if="allItemImages.length > 1" class="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
              <button v-for="(img, i) in allItemImages" :key="i" @click="selectedImageIndex = i"
                :class="['w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all', i === selectedImageIndex ? 'border-[#387b41] ring-2 ring-[#387b41]/30' : 'border-transparent opacity-60 hover:opacity-100']">
                <img :src="optimizeImageUrl(img)" class="w-full h-full object-cover" />
              </button>
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
                  <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ formatDate(item.reported_at) }}</p>
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
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ item.claimer?.nama || 'Another Student' }}</p>
            </div>
          </div>

          <!-- Proof of Return -->
          <div v-if="item.status === 'Returned' && item.claim_photo"
            class="bg-white dark:bg-[#1e1e1e] rounded-3xl p-4 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
            <h3 class="font-bold text-sm text-[#1c1b1b] dark:text-[#f3f4f6] mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-[#387b41]">verified</span>
              {{ t('detail.proof_of_return') }}
            </h3>
            <div class="space-y-4">
              <div class="rounded-2xl overflow-hidden bg-[#f3f5f2] dark:bg-[#2a2a2a]">
                <img :src="item.claim_photo" class="w-full object-cover" />
              </div>
              <div v-if="item.claim_notes" class="p-3 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-xl">
                <p class="text-xs text-[#40493d] dark:text-[#9ca3af] italic">"{{ item.claim_notes }}"</p>
              </div>
              <div class="flex items-center gap-2 text-sm text-[#40493d] dark:text-[#9ca3af]">
                <span class="material-symbols-outlined text-base">person</span>
                {{ t('detail.returned_by') }} {{ item.claimer?.nama || 'Claimer' }}
              </div>
            </div>
          </div>

          <!-- Chat System (Only for Founder and Claimer) -->
          <div v-if="item.status === 'On Progress' && (isFounder() || isClaimer())" 
            class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] border border-[#e0e4df] dark:border-[#374151] shadow-sm overflow-hidden flex flex-col h-[300px] md:h-[400px]">
            <div class="p-4 border-b border-[#e0e4df] dark:border-[#374151] bg-[#f8faf7] dark:bg-[#121212] flex items-center gap-2">
              <span class="material-symbols-outlined text-[#387b41]">forum</span>
              <h3 class="font-bold text-sm text-[#1c1b1b] dark:text-[#f3f4f6] flex items-center gap-1.5">
                {{ t('detail.chat_with') }} {{ isFounder() ? t('detail.claimer_label') : 'Founder' }}
                <span :class="['ml-5 inline-flex items-center gap-1 text-[10px] font-medium', isChatPartnerOnline ? 'text-[#29cc4e]' : 'text-[#9ca3af]']">
                  <span :class="['inline-block w-2 h-2 rounded-full', isChatPartnerOnline ? 'bg-[#29cc4e]' : 'bg-[#9ca3af]']"></span>
                  {{ isChatPartnerOnline ? 'Online' : 'Offline' }}
                </span>
              </h3>
            </div>
            
            <div id="chat-container" class="flex-1 overflow-y-auto p-4 space-y-4">
              <div v-for="msg in item.messages" :key="msg.id" 
                :class="['flex flex-col max-w-[80%]', msg.sender === currentUser.id ? 'ml-auto items-end' : 'mr-auto items-start']">
                <div :class="['px-4 py-2 rounded-2xl text-sm font-medium shadow-sm', 
                  msg.sender === currentUser.id ? 'bg-[#387b41] text-white rounded-tr-none' : 'bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#1c1b1b] dark:text-[#f3f4f6] rounded-tl-none']">
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
                    <p class="text-xs font-bold text-[#1c1b1b]">{{ item.claimer?.nama || t('detail.original_claimer') }}</p>
                    <p class="text-[10px] text-[#387b41]">{{ t('detail.claimer_label') }}</p>
                  </div>
                </div>
                <span class="px-4 py-2 bg-[#387b41]/10 text-[#387b41] rounded-lg text-xs font-bold flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  {{ t('detail.original_claimer') }}
                </span>
              </div>

              <!-- Complainers -->
              <div v-for="complaint in item.complaints" :key="complaint.id" 
                class="p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl flex items-center justify-between border border-red-100 dark:border-red-900/30">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">P</div>
                  <div>
                    <p class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ complaint.user?.nama || 'Another Student' }}</p>
                    <p class="text-[10px] text-red-600 dark:text-red-400">{{ t('detail.complained_label') }} "{{ complaint.reason }}"</p>
                  </div>
                </div>
                <button @click="assignClaimer(complaint.user?.id)" 
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
          <div class="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] overflow-hidden border border-[#e0e4df] dark:border-[#374151] shadow-sm flex flex-col h-full min-h-[350px] md:min-h-[500px] max-h-[800px]">
            <div class="p-6 md:p-8 border-b border-[#e0e4df] dark:border-[#374151]">
              <h2 class="text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] flex items-center gap-2">
                <span class="material-symbols-outlined text-[#387b41]">location_on</span>
                {{ t('detail.location_details') }}
              </h2>
              <p class="text-sm text-[#40493d] dark:text-[#9ca3af] mt-1">{{ item.type === 'lost' ? t('detail.last_seen') + ' ' + item.location : t('detail.found_at') + ' ' + item.location }}</p>
              <div v-if="item.area_category" class="mt-1.5 flex items-center gap-1">
                <span class="material-symbols-outlined text-xs text-[#40493d] dark:text-[#9ca3af]">business</span>
                <span class="text-xs text-[#40493d] dark:text-[#9ca3af] font-medium">{{ t('area.' + item.area_category) }}</span>
              </div>
              <div v-if="item.coordinates_lat != null" class="mt-2 flex items-center gap-2">
                <span class="text-[10px] text-[#387b41] font-bold flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">gps_fixed</span>
                  {{ item.coordinates_lat.toFixed(4) }}, {{ item.coordinates_lng.toFixed(4) }}
                </span>
                <button @click="copyGps(item.coordinates_lat, item.coordinates_lng)"
                  class="text-[10px] text-[#387b41] hover:text-[#2d6334] font-bold flex items-center gap-0.5 transition-colors"
                  title="Copy GPS coordinates">
                  <span class="material-symbols-outlined text-xs">content_copy</span>
                </button>
              </div>
            </div>
            
            <div v-if="item.coordinates_lat != null && item.coordinates_lng != null" ref="mapContainer" class="flex-1 w-full min-h-[250px] md:min-h-[300px]"></div>
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

              <button v-if="item.status === 'On Progress' && !isFounder() && !isClaimer() && !hasComplained() && !hasFiledComplaint"
                @click="fileComplaint"
                class="w-full py-4 bg-[#ba1a1a] text-white rounded-2xl font-bold text-base shadow-lg hover:bg-[#991515] active:scale-95 transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined">report</span>
                {{ t('detail.file_complaint') }}
              </button>
              <div v-else-if="item.status === 'On Progress' && !isFounder() && !isClaimer() && (hasComplained() || hasFiledComplaint)"
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

      <!-- Activity Timeline -->
      <div v-if="item && activities.length" class="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border border-[#e0e4df] dark:border-[#374151] shadow-sm overflow-hidden mb-20">
        <button @click="showActivities = !showActivities" class="w-full p-6 flex items-center justify-between hover:bg-[#f8faf7] dark:hover:bg-[#2a2a2a] transition-colors">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-[#387b41]">timeline</span>
            <h3 class="font-bold text-base text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t('detail.activity_log') || 'Activity Log' }}</h3>
          </div>
          <span class="material-symbols-outlined text-[#40493d] dark:text-[#9ca3af] transition-transform" :class="showActivities ? 'rotate-180' : ''">expand_more</span>
        </button>
        <div v-if="showActivities" class="px-6 pb-6 space-y-0">
          <div v-for="(act, i) in activities" :key="act.id" class="flex gap-4 relative">
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-[#f3f5f2] dark:bg-[#2a2a2a] flex items-center justify-center shrink-0 z-10">
                <span class="material-symbols-outlined text-sm text-[#387b41]">{{ activityIcons[act.action_type] || 'circle' }}</span>
              </div>
              <div v-if="i < activities.length - 1" class="w-px flex-1 bg-[#e0e4df] dark:bg-[#374151] min-h-[24px]"></div>
            </div>
            <div class="pb-6 pt-0.5">
              <p class="text-sm font-medium text-[#1c1b1b] dark:text-[#f3f4f6]">{{ act.description }}</p>
              <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af] mt-0.5">{{ formatDate(act.created_at) }}</p>
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
