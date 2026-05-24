<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useHead } from '@unhead/vue';
import { useRouter, useRoute } from 'vue-router';
import { supabase } from '../lib/supabase';
import { API_URL } from '@/config/api';
import axios from 'axios';
import { DotLottieVue } from '@lottiefiles/dotlottie-vue';

const router = useRouter();
const route = useRoute();
useHead({ title: 'Verifikasi Email — QReturn' });

const status = ref<'loading' | 'pending' | 'success' | 'error'>('loading');
const message = ref('');
const userEmail = ref('');

let pollInterval: ReturnType<typeof setInterval> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;

const fetchProfile = async (token: string) => {
  try {
    const res = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.success) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      status.value = 'success';
      message.value = 'Email verified successfully! Redirecting to dashboard...';

      window.history.replaceState(null, '', '/verify-email');

      setTimeout(() => router.push('/dashboard'), 2000);
    } else {
      status.value = 'error';
      message.value = 'Failed to fetch user profile. Please try logging in manually.';
    }
  } catch (err: any) {
    status.value = 'error';
    message.value = err.response?.data?.message || 'An unexpected error occurred during verification.';
  }
};

const startPolling = () => {
  pollInterval = setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      stopListening();
      await fetchProfile(session.access_token);
    }
  }, 3000);
};

const setupAuthListener = () => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      stopListening();
      fetchProfile(session.access_token);
    }
  });
  authSubscription = data.subscription;
};

const stopListening = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }
};

const resendEmail = async () => {
  if (!userEmail.value) return;
  status.value = 'loading';
  message.value = 'Sending new confirmation email...';

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: userEmail.value
  });

  if (error) {
    status.value = 'error';
    message.value = error.message || 'Failed to resend. Please try again.';
  } else {
    status.value = 'pending';
    message.value = `New confirmation email sent to ${userEmail.value}! Check your inbox.`;
  }
};

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    await fetchProfile(session.access_token);
    return;
  }

  const hash = window.location.hash;
  const params = new URLSearchParams(hash.replace('#', ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const hashError = params.get('error');
  const hashErrorDesc = params.get('error_description');

  if (hashError) {
    status.value = 'error';
    message.value = hashErrorDesc || 'Email verification failed. The link may have expired.';
    return;
  }

  if (accessToken && refreshToken) {
    status.value = 'loading';
    message.value = 'Verifying your email...';

    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (sessionError || !data.session) {
      status.value = 'error';
      message.value = 'Session expired. Please request a new confirmation email.';
      return;
    }

    window.history.replaceState(null, '', '/verify-email');
    await fetchProfile(data.session.access_token);
    return;
  }

  userEmail.value = (route.query.email as string) || '';
  status.value = 'pending';
  message.value = userEmail.value
    ? `We sent a verification email to ${userEmail.value}. Please check your inbox and click the link.`
    : 'Please check your email and click the verification link.';

  startPolling();
  setupAuthListener();
});

onBeforeUnmount(() => {
  stopListening();
});
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex flex-col items-center justify-center p-4 font-sans">
    <div class="m-4 text-center items-center">
      <div class="flex items-center justify-center gap-2 mb-2">
        <div class="mb-2 p-2 w-12 h-12 bg-[#387b41]/10 rounded-lg flex items-center justify-center">
          <img src="/logo.png" alt="" class="w-full h-full object-cover" loading="lazy">
        </div>
        <p class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">QReturn</p>
      </div>
    </div>

    <div class="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] shadow-2xl p-10 border border-[#e0e4df] dark:border-[#374151] relative overflow-hidden">
      <div class="absolute -top-20 -right-20 w-40 h-40 bg-[#387b41] opacity-5 rounded-full"></div>

      <div class="flex flex-col items-center mb-8 relative z-10">
        <!-- Loading State -->
        <div v-if="status === 'loading'" class="flex flex-col items-center">
          <DotLottieVue src="/animations/qranimation.json" :autoplay="true" :loop="true" style="width:120px;height:120px" />
          <h2 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mt-4">Verifying Email</h2>
          <p class="text-sm text-[#40493d] dark:text-[#9ca3af] text-center mt-2">{{ message }}</p>
        </div>

        <!-- Pending State — waiting for user to click email link -->
        <div v-else-if="status === 'pending'" class="flex flex-col items-center">
          <div class="w-20 h-20 bg-[#fef2f2] dark:bg-[#7f1d1d]/20 rounded-full flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-5xl text-[#f59e0b]">mark_email_unread</span>
          </div>
          <h2 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">Check Your Email</h2>
          <p class="text-sm text-[#40493d] dark:text-[#9ca3af] text-center mt-2">{{ message }}</p>
          <div v-if="userEmail" class="mt-4 px-4 py-2 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-xl text-xs text-[#40493d] dark:text-[#9ca3af]">
            {{ userEmail }}
          </div>

          <div class="w-8 h-8 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin mt-6"></div>
          <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af] mt-3 font-medium">Waiting for verification...</p>

          <div class="flex flex-col gap-3 w-full max-w-xs mt-8">
            <button @click="resendEmail"
              class="w-full py-3 bg-[#387b41] text-white rounded-xl font-bold text-sm hover:bg-[#2d6334] transition-all shadow-md active:scale-95">
              <span class="material-symbols-outlined text-lg align-middle mr-1">refresh</span>
              Resend Confirmation Email
            </button>
            <button @click="router.push('/')"
              class="w-full py-3 bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#40493d] dark:text-[#9ca3af] rounded-xl font-bold text-sm hover:bg-[#e0e4df] dark:hover:bg-[#374151] transition-all">
              Back to Login
            </button>
          </div>
        </div>

        <!-- Success State -->
        <div v-else-if="status === 'success'" class="flex flex-col items-center">
          <div class="w-20 h-20 bg-[#f0fdf4] dark:bg-[#115431]/20 rounded-full flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-5xl text-[#387b41]">check_circle</span>
          </div>
          <h2 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">Email Verified!</h2>
          <p class="text-sm text-[#40493d] dark:text-[#9ca3af] text-center mt-2">{{ message }}</p>
          <div v-if="userEmail" class="mt-4 px-4 py-2 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-xl text-xs text-[#40493d] dark:text-[#9ca3af]">
            {{ userEmail }}
          </div>
        </div>

        <!-- Error State -->
        <div v-else class="flex flex-col items-center">
          <div class="w-20 h-20 bg-[#fef2f2] dark:bg-[#7f1d1d]/20 rounded-full flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-5xl text-[#ef4444]">error</span>
          </div>
          <h2 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">Verification Failed</h2>
          <p class="text-sm text-[#40493d] dark:text-[#9ca3af] text-center mt-2 mb-6">{{ message }}</p>

          <div class="flex flex-col gap-3 w-full max-w-xs">
            <button @click="resendEmail"
              class="w-full py-3 bg-[#387b41] text-white rounded-xl font-bold text-sm hover:bg-[#2d6334] transition-all shadow-md active:scale-95">
              <span class="material-symbols-outlined text-lg align-middle mr-1">refresh</span>
              Resend Confirmation Email
            </button>
            <button @click="router.push('/')"
              class="w-full py-3 bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#40493d] dark:text-[#9ca3af] rounded-xl font-bold text-sm hover:bg-[#e0e4df] dark:hover:bg-[#374151] transition-all">
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="mt-8 text-[11px] text-[#40493d] dark:text-[#9ca3af] font-medium uppercase tracking-[0.2em]">SMK Negeri 2 Depok Digital Service</p>
  </div>
</template>
