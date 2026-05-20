<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useHead } from '@unhead/vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useI18n } from '../i18n';
import { API_URL } from '@/config/api';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
useHead({ title: () => `${t('profile.public_title')} — QReturn` });

const profile = ref<any>(null);
const isLoading = ref(true);
const notFound = ref(false);

const platforms: { key: string; icon: string; buildUrl: (val: string) => string }[] = [
  { key: 'wa', icon: 'chat', buildUrl: (v) => `https://wa.me/${v}` },
  { key: 'ig', icon: 'photo_camera', buildUrl: (v) => `https://instagram.com/${v}` },
  { key: 'fb', icon: 'facebook', buildUrl: (v) => `https://facebook.com/${v}` },
  { key: 'tg', icon: 'send', buildUrl: (v) => `https://t.me/${v}` },
];

const contactButtons = computed(() => {
  if (!profile.value) return [];
  return platforms
    .filter(p => profile.value[p.key] && profile.value[p.key] !== 'wa')
    .map(p => ({ ...p, url: p.buildUrl(profile.value[p.key]), label: profile.value[p.key] }));
});

// WA is special — we use wa_raw for the actual link, wa (masked) for display
const waLink = computed(() => {
  if (!profile.value?.wa_raw) return null;
  return `https://wa.me/${profile.value.wa_raw}`;
});

onMounted(async () => {
  try {
    const username = route.params.username as string;
    const res = await axios.get(`${API_URL}/api/profile/${username}`);
    profile.value = res.data.profile;
  } catch {
    notFound.value = true;
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex items-center justify-center p-4 font-sans">
    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
    </div>

    <div v-else-if="notFound" class="text-center">
      <div class="w-24 h-24 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-6">
        <span class="material-symbols-outlined text-5xl text-[#40493d] dark:text-[#9ca3af]">person_off</span>
      </div>
      <h2 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-3">Profile Not Found</h2>
      <p class="text-sm text-[#40493d] dark:text-[#9ca3af] mb-8">This user profile does not exist.</p>
      <a href="/report" class="inline-block px-8 py-3 bg-[#387b41] text-white rounded-xl font-bold hover:bg-[#2d6334] transition-all shadow-sm">
        Report a Lost Item
      </a>
    </div>

    <div v-else-if="profile" class="w-full max-w-md">
      <div class="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border border-[#e0e4df] dark:border-[#374151] shadow-sm overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-[#387b41] to-[#2d6334] p-8 text-center">
          <div class="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span class="text-white text-3xl font-bold">{{ (profile.nama || '?').charAt(0) }}</span>
          </div>
          <h1 class="text-2xl font-bold text-white">{{ profile.nama }}</h1>
          <p v-if="profile.jurusan" class="text-sm text-white/70 mt-1">{{ profile.jurusan }}</p>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6">
          <!-- Bio -->
          <div v-if="profile.bio" class="p-4 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-2xl">
            <p class="text-sm text-[#40493d] dark:text-[#9ca3af] leading-relaxed">{{ profile.bio }}</p>
          </div>
          <p v-else class="text-xs text-[#40493d] dark:text-[#9ca3af]/50 italic text-center">{{ t('profile.public_bio_empty') }}</p>

          <!-- Contact -->
          <div v-if="waLink || contactButtons.length" class="space-y-3">
            <p class="text-xs font-bold text-[#40493d] dark:text-[#9ca3af] uppercase tracking-wider">{{ t('profile.public_contact') }}</p>

            <a v-if="waLink" :href="waLink" target="_blank"
              class="flex items-center gap-3 p-4 bg-[#e8f5e9] dark:bg-green-950/20 rounded-2xl border border-[#387b41]/20 hover:bg-[#c8e6c9] dark:hover:bg-green-900/30 transition-colors">
              <span class="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shrink-0">
                <span class="material-symbols-outlined text-lg">chat</span>
              </span>
              <div class="flex-1">
                <p class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">WhatsApp</p>
                <p class="text-xs text-[#40493d] dark:text-[#9ca3af]">{{ profile.wa }}</p>
              </div>
              <span class="material-symbols-outlined text-[#40493d] dark:text-[#9ca3af] text-sm">open_in_new</span>
            </a>

            <a v-for="btn in contactButtons" :key="btn.key" :href="btn.url" target="_blank"
              class="flex items-center gap-3 p-4 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-2xl hover:bg-[#e0e4df] dark:hover:bg-[#374151] transition-colors">
              <span class="w-10 h-10 rounded-full bg-[#387b41]/10 flex items-center justify-center text-[#387b41] shrink-0">
                <span class="material-symbols-outlined text-lg">{{ btn.icon }}</span>
              </span>
              <div class="flex-1">
                <p class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ btn.key === 'ig' ? 'Instagram' : btn.key === 'fb' ? 'Facebook' : 'Telegram' }}</p>
                <p class="text-xs text-[#40493d] dark:text-[#9ca3af]">{{ btn.label }}</p>
              </div>
              <span class="material-symbols-outlined text-[#40493d] dark:text-[#9ca3af] text-sm">open_in_new</span>
            </a>
          </div>

          <!-- CTA -->
          <a href="/report"
            class="block w-full py-4 bg-[#387b41] text-white rounded-2xl font-bold text-base text-center hover:bg-[#2d6334] transition-all active:scale-95 shadow-sm">
            {{ t('profile.public_report_lost') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
