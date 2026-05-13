<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '@/config/api';
import { useI18n } from '../i18n';
import schoolLogo from '../assets/school-logo.png';

const router = useRouter();
const { t, locale, toggleLocale } = useI18n();
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'));
const notifications = ref<any[]>([]);
const unreadCount = ref(0);
const showDropdown = ref(false);
let socket: any = null;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchNotifications = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/notifications`, { headers: getAuthHeaders() });
    notifications.value = res.data;
    unreadCount.value = notifications.value.filter(n => !n.isRead).length;
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }
};

const markAsRead = async (id: string) => {
  try {
    await axios.post(`${API_URL}/api/notifications/${id}/read`, {}, { headers: getAuthHeaders() });
    fetchNotifications();
  } catch (error) {
    console.error('Error marking as read:', error);
  }
};

onMounted(() => {
  fetchNotifications();
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true
  });
  
  socket.on('connect', () => {
    socket.emit('join-user', user.value._id);
  });

  socket.on('notification', (notif: any) => {
    notifications.value.unshift(notif);
    unreadCount.value++;
  });
});

onBeforeUnmount(() => {
  if (socket) socket.disconnect();
});
</script>

<template>
  <header class="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-16 bg-white/80 backdrop-blur-md border-b border-[#e0e4df] z-40">
    <div class="flex justify-between items-center px-8 w-full h-full">
      <div class="flex items-center gap-4 w-full max-w-md">
        <div class="relative w-full focus-within:ring-2 focus-within:ring-[#387b41]/20 rounded-lg transition-all">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#40493d] text-xl">search</span>
          <input type="text" :placeholder="t('topnav.search_placeholder')" class="w-full bg-[#f3f5f2] border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-0 outline-none" />
        </div>
      </div>

      <div class="flex items-center gap-4">
        <!-- Language Toggle -->
        <button @click="toggleLocale"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-[#e0e4df] hover:border-[#387b41]/30 hover:bg-[#f0fdf4]"
          :class="locale === 'id' ? 'bg-[#f0fdf4] text-[#387b41] border-[#387b41]/20' : 'bg-[#f3f5f2] text-[#40493d]'"
          :title="locale === 'en' ? 'Switch to Indonesian' : 'Ganti ke Bahasa Inggris'">
          <span class="text-base leading-none">{{ locale === 'en' ? '🇺🇸' : '🇮🇩' }}</span>
          <span>{{ locale === 'en' ? 'EN' : 'ID' }}</span>
        </button>

        <!-- Notifications -->
        <div class="relative">
          <button @click="showDropdown = !showDropdown" class="text-[#40493d] hover:text-[#387b41] transition-colors relative p-2 rounded-full hover:bg-[#f3f5f2]">
            <span class="material-symbols-outlined">notifications</span>
            <span v-if="unreadCount > 0" class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full font-bold border-2 border-white">
              {{ unreadCount }}
            </span>
          </button>

          <!-- Dropdown -->
          <div v-if="showDropdown" class="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-[#e0e4df] overflow-hidden">
            <div class="p-4 border-b border-[#e0e4df] flex justify-between items-center bg-[#f8faf7]">
              <h4 class="font-bold text-sm text-[#1c1b1b]">{{ t('topnav.notifications') }}</h4>
              <span class="text-[10px] text-[#40493d] font-bold uppercase tracking-wider">{{ unreadCount }} {{ t('topnav.new') }}</span>
            </div>
            <div class="max-h-96 overflow-y-auto">
              <div v-for="notif in notifications" :key="notif._id" 
                @click="markAsRead(notif._id); router.push(`/item/${notif.item}`); showDropdown = false"
                :class="['p-4 border-b border-[#f3f5f2] cursor-pointer hover:bg-[#f8faf7] transition-all flex gap-3', !notif.isRead && 'bg-[#f0fdf4]']">
                <div :class="['w-10 h-10 rounded-full flex items-center justify-center shrink-0', 
                  notif.type === 'message' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600']">
                  <span class="material-symbols-outlined text-xl">{{ notif.type === 'message' ? 'chat' : 'notifications' }}</span>
                </div>
                <div>
                  <p class="text-xs font-bold text-[#1c1b1b] mb-1">{{ notif.text }}</p>
                  <p class="text-[10px] text-[#40493d]">{{ new Date(notif.createdAt).toLocaleTimeString() }}</p>
                </div>
              </div>
              <div v-if="notifications.length === 0" class="p-8 text-center text-[#40493d] text-xs italic">
                {{ t('topnav.no_notifications') }}
              </div>
            </div>
          </div>
        </div>

        <div class="h-8 w-[1px] bg-[#e0e4df]"></div>

        <!-- User Profile -->
        <div class="flex items-center gap-3">
          <div class="text-right hidden lg:block">
            <p class="text-sm font-bold text-[#1c1b1b]">{{ user.nama || t('topnav.student') }}</p>
            <p class="text-[10px] text-[#40493d] font-medium">{{ user.nisn ? `${t('topnav.student')} (${user.nisn})` : user.email || t('topnav.student') }}</p>
          </div>
          <!-- QR login user: show school logo -->
          <div v-if="user.nisn" class="w-10 h-10 rounded-full border-2 border-[#387b41]/20 overflow-hidden bg-white flex items-center justify-center">
            <img :src="schoolLogo" alt="School Logo" class="w-full h-full object-cover" />
          </div>
          <!-- Email login user: show default letter avatar -->
          <div v-else class="w-10 h-10 rounded-full border-2 border-[#387b41]/20 bg-[#f0fdf4] flex items-center justify-center">
            <span class="text-[#387b41] font-bold text-lg">{{ (user.nama || 'S').charAt(0) }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
