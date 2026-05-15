<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '@/config/api';
import { useI18n } from '../i18n';
import Marquee from './Marquee.vue';
import schoolLogo from '../assets/school-logo.png';

const router = useRouter();
const route = useRoute();
const { t, locale, toggleLocale } = useI18n();
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'));
const notifications = ref<any[]>([]);
const unreadCount = ref(0);
const showDropdown = ref(false);
const showProfileDropdown = ref(false);
const searchQuery = ref((route.query.q as string) || '');
let socket: any = null;

const isDark = ref(localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches));

const toggleTheme = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value } });
  } else {
    router.push({ path: '/search' });
  }
};

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
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  fetchNotifications();
  const token = localStorage.getItem('token');
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: { token }
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
  <header class="gap-4 md:gap-12 fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-16 bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur-md border-b border-[#e0e4df] dark:border-[#374151] z-40">
    <div class="flex justify-between items-center px-4 md:px-8 w-full h-full">
      <div class="flex items-center gap-4 w-full max-w-full">
        <div class="relative w-full focus-within:ring-2 focus-within:ring-[#387b41]/20 dark:focus-within:ring-[#88d982]/20 rounded-lg transition-all">
          <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[#40493d] dark:text-[#9ca3af] dark:text-gray-400 text-xl ">search</span>
          <input v-model="searchQuery" @keyup.enter="handleSearch" type="text" :placeholder="t('topnav.search_placeholder')" class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-none rounded-lg pl-10 pr-4 py-2 text-xs md:text-sm pl-12 focus:ring-0 outline-none" />
        </div>
      </div>

      <div class="ml-2 md:ml-4 flex items-center gap-2 md:gap-4 shrink-0">
        <!-- Notifications -->
        <div class="relative">
          <button @click="showDropdown = !showDropdown" class="text-[#40493d] dark:text-[#9ca3af] dark:text-gray-400 hover:text-[#387b41] dark:hover:text-[#88d982] transition-colors relative p-2 w-12 h-12 rounded-full">
            <span class="material-symbols-outlined">notifications</span>
            <span v-if="unreadCount > 0" class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full font-bold border-2 border-white">
              {{ unreadCount }}
            </span>
          </button>

          <!-- Dropdown -->
          <div v-if="showDropdown" class="z-20 absolute right-0 mt-3 w-80 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#e0e4df] dark:border-[#374151] overflow-hidden">
            <div class="p-4 border-b border-[#e0e4df] dark:border-[#374151] flex justify-between items-center bg-[#f8faf7] dark:bg-[#121212]">
              <h4 class="font-bold text-sm text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t('topnav.notifications') }}</h4>
              <span class="text-[10px] text-[#40493d] dark:text-[#9ca3af] font-bold uppercase tracking-wider">{{ unreadCount }} {{ t('topnav.new') }}</span>
            </div>
            <div class="max-h-96 overflow-y-auto">
              <div v-for="notif in notifications" :key="notif._id" 
                @click="markAsRead(notif._id); router.push(`/item/${notif.item}`); showDropdown = false"
                :class="['p-4 border-b border-[#f3f5f2] cursor-pointer hover:bg-[#f8faf7] dark:bg-[#121212] dark:hover:bg-[#353535] transition-all flex gap-3', !notif.isRead && 'bg-[#f0fdf4]']">
                <div :class="['w-10 h-10 rounded-full flex items-center justify-center shrink-0', 
                  notif.type === 'message' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600']">
                  <span class="material-symbols-outlined text-xl">{{ notif.type === 'message' ? 'chat' : 'notifications' }}</span>
                </div>
                <div>
                  <p class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1">{{ notif.text }}</p>
                  <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af]">{{ new Date(notif.createdAt).toLocaleTimeString() }}</p>
                </div>
              </div>
              <div v-if="notifications.length === 0" class="p-8 text-center text-[#40493d] dark:text-[#9ca3af] text-xs italic">
                {{ t('topnav.no_notifications') }}
              </div>
            </div>
          </div>
        </div>

        <div class="h-6 md:h-8 w-[1px] bg-[#e0e4df] dark:bg-white/10"></div>

        <!-- User Profile -->
        <div class="relative">
          <button @click="showProfileDropdown = !showProfileDropdown" class="flex items-center gap-2 md:gap-3 outline-none hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] p-1 pr-2 md:pr-3 rounded-full transition-all">
            <!-- QR login user: show school logo -->
            <div v-if="user.nisn" class="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#387b41]/20 dark:border-[#88d982]/20 overflow-hidden bg-white dark:bg-[#1e1e1e] flex items-center justify-center">
              <img :src="schoolLogo" alt="School Logo" class="w-full h-full object-cover" />
            </div>
            <!-- Email login user: show default letter avatar -->
            <div v-else class="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#387b41]/20 dark:border-[#88d982]/20 bg-[#f0fdf4] dark:bg-[#115431] flex items-center justify-center">
              <span class="text-[#387b41] dark:text-[#88d982] font-bold text-base md:text-lg">{{ (user.nama || 'S').charAt(0) }}</span>
            </div>
            <div class="text-left hidden lg:block">
              <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6] dark:text-white">{{ user.nama || t('topnav.student') }}</p>
              <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af] dark:text-gray-400 font-medium">{{ user.nisn ? `${t('topnav.student')} (${user.nisn})` : user.email || t('topnav.student') }}</p>
            </div>
            <span class="material-symbols-outlined text-[#40493d] dark:text-[#9ca3af] ml-1">expand_more</span>
          </button>

          <!-- Profile Dropdown -->
          <div v-if="showProfileDropdown" class="absolute right-0 mt-3 w-56 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#e0e4df] dark:border-[#374151] overflow-hidden z-40">
            <div class="p-4 border-b border-[#e0e4df] dark:border-[#374151] bg-[#f8faf7] dark:bg-[#121212] lg:hidden">
              <h4 class="font-bold text-sm text-[#1c1b1b] dark:text-[#f3f4f6]">{{ user.nama || t('topnav.student') }}</h4>
              <p class="text-xs text-[#40493d] dark:text-[#9ca3af]">{{ user.nisn ? `${t('topnav.student')} (${user.nisn})` : user.email }}</p>
            </div>
            <div class="p-2 flex flex-col gap-1">
              <button @click="toggleLocale" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] transition-all text-sm font-medium text-[#1c1b1b] dark:text-[#f3f4f6]">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-xl text-[#40493d] dark:text-[#9ca3af]">language</span>
                  <span>{{ locale === 'en' ? 'English' : 'Indonesia' }}</span>
                </div>
                <span class="text-lg leading-none">{{ locale === 'en' ? '🇺🇸' : '🇮🇩' }}</span>
              </button>

              <button @click="toggleTheme" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] transition-all text-sm font-medium text-[#1c1b1b] dark:text-[#f3f4f6]">
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-xl text-[#40493d] dark:text-[#9ca3af]">{{ isDark ? 'light_mode' : 'dark_mode' }}</span>
                  <span>{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
                </div>
              </button>

              <RouterLink to="/statistics" @click="showProfileDropdown = false"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] transition-all text-sm font-medium text-[#1c1b1b] dark:text-[#f3f4f6]">
                <span class="material-symbols-outlined text-xl text-[#40493d] dark:text-[#9ca3af]">leaderboard</span>
                <span>{{ t('nav.statistics') }}</span>
              </RouterLink>

              <RouterLink to="/rating" @click="showProfileDropdown = false"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] transition-all text-sm font-medium text-[#1c1b1b] dark:text-[#f3f4f6]">
                <span class="material-symbols-outlined text-xl text-[#40493d] dark:text-[#9ca3af]">star</span>
                <span>Rate App</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Running Text / Marquee -->
  </header>
</template>
