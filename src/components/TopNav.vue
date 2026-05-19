<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '@/config/api';
import { supabase } from '@/lib/supabase';
import { useI18n } from '../i18n';
import { useNotifications } from '../composables/useNotifications';
import Marquee from './Marquee.vue';
import schoolLogo from '../assets/school-logo.png';

const router = useRouter();
const route = useRoute();
const { t, locale, toggleLocale } = useI18n();
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'));
const loadingProfile = ref(true);
const showDropdown = ref(false);
const showProfileDropdown = ref(false);
const searchQuery = ref((route.query.q as string) || '');
let socket: any = null;

const handleLogout = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  router.push('/');
};

const { notifications, unreadCount, fetchNotifications: fetchNotifs, subscribeToNotifications, deleteNotification: deleteNotif, deleteAllNotifications: deleteAllNotifs, unsubscribe } = useNotifications();

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

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
};

const fetchNotifications = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetchNotifs(session.user.id);
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }
};

const onNotificationClick = async (id: string, itemId: string | null) => {
  try {
    await deleteNotif(id);
    if (itemId) router.push(`/item/${itemId}`);
  } catch (error) {
    console.error('Error handling notification:', error);
  }
};

onMounted(async () => {
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    fetchNotifications();
    subscribeToNotifications(session.user.id);

    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.data.success) {
        user.value = res.data.user;
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      loadingProfile.value = false;
    }
  } else {
    loadingProfile.value = false;
  }

  socket = io(SOCKET_URL, {
    transports: ['polling'],
    withCredentials: true,
    auth: { token: session?.access_token }
  });
  
  socket.on('connect', () => {
    const userId = user.value?.id || session?.user?.id;
    if (userId) socket.emit('join-user', userId);
  });
});

onBeforeUnmount(() => {
  if (socket) socket.disconnect();
  unsubscribe();
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
          <div v-if="showDropdown" class="z-20 absolute right-[-30px] mt-3 w-80 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#e0e4df] dark:border-[#374151] overflow-hidden">
            <div class="p-4 border-b border-[#e0e4df] dark:border-[#374151] flex justify-between items-center bg-[#f8faf7] dark:bg-[#121212]">
              <h4 class="font-bold text-sm text-[#1c1b1b] dark:text-[#f3f4f6]">{{ t('topnav.notifications') }}</h4>
              <span class="text-[10px] text-[#40493d] dark:text-[#9ca3af] font-bold uppercase tracking-wider">{{ unreadCount }} {{ t('topnav.new') }}</span>
            </div>
            <div v-if="notifications.length > 0" class="px-4 py-2 border-b border-[#e0e4df] dark:border-[#374151] bg-[#fcf9f8] dark:bg-[#1a1a1a]">
              <button @click="deleteAllNotifs(); showDropdown = false"
                class="text-[#ba1a1a] hover:text-[#991515] text-[10px] font-bold flex items-center gap-1 transition-colors">
                <span class="material-symbols-outlined text-sm">delete</span>
                Delete All
              </button>
            </div>
            <div class="max-h-96 overflow-y-auto">
              <div v-for="notif in notifications" :key="notif.id" 
                @click="onNotificationClick(notif.id, notif.item_id); showDropdown = false"
                :class="['p-4 border-b border-[#f3f5f2] cursor-pointer hover:bg-[#f8faf7] dark:bg-[#121212] dark:hover:bg-[#353535] transition-all flex gap-3', !notif.is_read && 'bg-[#f0fdf4]']">
                <div :class="['w-10 h-10 rounded-full flex items-center justify-center shrink-0', 
                  notif.type === 'message' ? 'bg-blue-100 text-blue-600' : 
                  notif.type === 'suggestion' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600']">
                  <span class="material-symbols-outlined text-xl">{{ 
                    notif.type === 'message' ? 'chat' : 
                    notif.type === 'suggestion' ? 'lightbulb' : 'notifications' 
                  }}</span>
                </div>
                <div>
                  <p class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1">{{ notif.text }}</p>
                  <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af]">{{ new Date(notif.created_at).toLocaleTimeString() }}</p>
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
              <div v-if="loadingProfile" class="animate-pulse space-y-1">
                <div class="h-4 w-24 bg-gray-200 dark:bg-[#374151] rounded"></div>
                <div class="h-3 w-36 bg-gray-200 dark:bg-[#374151] rounded"></div>
              </div>
              <template v-else>
                <p class="text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6] dark:text-white">{{ user.nama || t('topnav.student') }}</p>
                <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af] dark:text-gray-400 font-medium">{{ user.nisn ? `${t('topnav.student')} (${user.nisn})` : user.email || t('topnav.student') }}</p>
              </template>
            </div>
            <span class="material-symbols-outlined text-[#40493d] dark:text-[#9ca3af] ml-1">expand_more</span>
          </button>

          <!-- Profile Dropdown -->
          <div v-if="showProfileDropdown" class="absolute right-0 mt-3 w-56 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#e0e4df] dark:border-[#374151] overflow-hidden z-40">
            <div class="p-4 border-b border-[#e0e4df] dark:border-[#374151] bg-[#f8faf7] dark:bg-[#121212] lg:hidden">
              <h4 v-if="loadingProfile" class="animate-pulse h-4 w-24 bg-gray-200 dark:bg-[#374151] rounded"></h4>
              <template v-else>
                <h4 class="font-bold text-sm text-[#1c1b1b] dark:text-[#f3f4f6]">{{ user.nama || t('topnav.student') }}</h4>
                <p class="text-xs text-[#40493d] dark:text-[#9ca3af]">{{ user.nisn ? `${t('topnav.student')} (${user.nisn})` : user.email }}</p>
              </template>
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

              <RouterLink to="/profile" @click="showProfileDropdown = false"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] transition-all text-sm font-medium text-[#1c1b1b] dark:text-[#f3f4f6]">
                <span class="material-symbols-outlined text-xl text-[#40493d] dark:text-[#9ca3af]">badge</span>
                <span>{{ t('nav.profile') }}</span>
              </RouterLink>

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
              <RouterLink to="/tutorial" @click="showProfileDropdown = false"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] transition-all text-sm font-medium text-[#1c1b1b] dark:text-[#f3f4f6]">
                <span class="material-symbols-outlined text-xl text-[#40493d] dark:text-[#9ca3af]">help</span>
                <span>{{ t('dash.how_it_works') }}</span>
              </RouterLink>
              <button @click="handleLogout()"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] transition-all text-sm font-medium text-[#890404] dark:text-[#ac0000]">
                <span class="material-symbols-outlined text-xl text-[#890404] dark:text-[#ac0000]">logout</span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Running Text / Marquee -->
  </header>
</template>
