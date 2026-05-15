<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { API_URL } from '@/config/api';
import { useToast } from '../composables/useToast';
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

const router = useRouter();
const status = ref('Ready to scan');
const statusType = ref('info');
const resultData = ref<any>(null);
const lastScan = ref('');
let html5QrCode: Html5Qrcode | null = null;
const toast = useToast();
const loginMode = ref<'qr' | 'email'>('qr');
const emailForm = ref({ email: '', password: '', nama: '' });
const isEmailMode = ref<'login' | 'register'>('login');
const isSubmitting = ref(false);

const setStatus = (message: string, type = 'info') => {
  status.value = message;
  statusType.value = type;
};

const storeAuth = (token: string, user: any) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

const onScanSuccess = async (decodedText: string) => {
  if (decodedText === lastScan.value) return;
  lastScan.value = decodedText;
  try {
    const isItemId = /^[0-9a-fA-F]{24}$/.test(decodedText.trim());
    if (isItemId) {
      const token = localStorage.getItem('token');
      if (!token) { setStatus("Please login first to claim items.", "error"); return; }
      setStatus("Claiming item...", "info");
      const res = await axios.post(`${API_URL}/api/items/${decodedText.trim()}/claim`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) { setStatus("Item claimed!", "success"); setTimeout(() => router.push('/dashboard'), 2000); }
      return;
    }
    const lines = decodedText.trim().split("\t").map(l => l.trim());
    if (lines.length < 6) throw new Error("QR Code format invalid");
    const nisData = (lines[1] || '').split("/");
    if (nisData.length < 2) throw new Error("NIS/NISN format invalid");
    const data = { nama: lines[0] || 'Unknown', nisn: nisData[0], nis: nisData[1], jurusan: lines[2], ttl: lines[3], agama: lines[4], gender: lines[5] };
    resultData.value = data;
    setStatus("Student ID verified", "success");
    const res = await axios.post(`${API_URL}/api/login`, data);
    if (res.data.success) {
      storeAuth(res.data.token, res.data.user);
      setStatus("Login successful! Redirecting...", "success");
      setTimeout(() => router.push('/dashboard'), 1500);
    } else throw new Error(res.data.message || "Login failed");
  } catch (err: any) {
    setStatus(err.response?.data?.message || err.message || "Invalid QR Code", "error");
  }
};

const handleEmailSubmit = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const url = isEmailMode.value === 'login' ? `${API_URL}/api/auth/login-email` : `${API_URL}/api/auth/register-email`;
    const payload = isEmailMode.value === 'login' ? { email: emailForm.value.email, password: emailForm.value.password } : { ...emailForm.value };
    if (isEmailMode.value === 'register' && !emailForm.value.nama.trim()) { setStatus('Name required', 'error'); isSubmitting.value = false; return; }
    const res = await axios.post(url, payload);
    if (res.data.success) {
      storeAuth(res.data.token, res.data.user);
      setStatus("Login successful! Redirecting...", "success");
      setTimeout(() => router.push('/dashboard'), 1500);
    }
  } catch (err: any) {
    setStatus(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Connection failed.', 'error');
  } finally { isSubmitting.value = false; }
};

const startCamera = () => {
  if (html5QrCode) return;
  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanSuccess, () => {}).catch(() => setStatus("Camera access failed", "error"));
};
const stopCamera = () => { if (html5QrCode) { html5QrCode.stop().catch(() => {}); html5QrCode = null; } };
const switchMode = (mode: 'qr' | 'email') => { loginMode.value = mode; setStatus('', 'info'); if (mode === 'qr') setTimeout(startCamera, 100); else stopCamera(); };

onMounted(() => { if (loginMode.value === 'qr') startCamera(); });
onUnmounted(() => stopCamera());
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex flex-col items-center justify-center p-4 font-sans">
    <div class="m-4 text-center items-center">
      <div class="flex items-center justify-center gap-2 mb-2">
        <div class="mb-2 p-2 w-12 h-12 bg-[#387b41]/10 rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="" class="w-full h-full object-cover">
          </div>
        <p class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">QReturn</p>
      </div>
    </div>
    <div class="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] shadow-2xl p-10 border border-[#e0e4df] dark:border-[#374151] relative overflow-hidden">
      <div class="absolute -top-20 -right-20 w-40 h-40 bg-[#387b41] opacity-5 rounded-full"></div>
      <div class="flex flex-col items-center mb-4 relative z-10">
        <div class="w-10 h-10 bg-[#f0fdf4] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <span class="material-symbols-outlined text-4xl text-[#387b41]">{{ loginMode === 'qr' ? 'qr_code_scanner' : 'mail' }}</span>
        </div>
        <h2 class="text-8xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] tracking-tight">Student Login</h2>
        <p class="text-sm text-[#40493d] dark:text-[#9ca3af] text-center mt-1 leading-relaxed px-4">
          {{ loginMode === 'qr' ? "Scan your Student ID QR code below." : isEmailMode === 'login' ? "Sign in with email." : "Create a new account." }}
        </p>
      </div>

      <!-- Mode Switcher -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-2xl mb-2">
        <button @click="switchMode('qr')" :class="['py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2', loginMode === 'qr' ? 'bg-white dark:bg-[#1e1e1e] text-[#387b41] shadow-sm' : 'text-[#40493d] dark:text-[#9ca3af]']">
          <span class="material-symbols-outlined text-xl">qr_code_scanner</span> QR Code
        </button>
        <button @click="switchMode('email')" :class="['py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2', loginMode === 'email' ? 'bg-white dark:bg-[#1e1e1e] text-[#387b41] shadow-sm' : 'text-[#40493d] dark:text-[#9ca3af]']">
          <span class="material-symbols-outlined text-xl">mail</span> Email
        </button>
      </div>

      <!-- QR Mode -->
      <div v-if="loginMode === 'qr'" class="relative mb-8">
        <div class="flex justify-center">
          <DotLottieVue src="/animations/qranimation.json" :autoplay="true" :loop="true" style="width:120px;height:120px" />
        </div>
        <div id="reader" class="qr-reader overflow-hidden rounded-3xl border-2 border-[#e0e4df] dark:border-[#374151] bg-[#1c1b1b] aspect-square w-full max-w-[280px] mx-auto shadow-inner"></div>
      </div>

      <!-- Email Mode -->
      <form v-else @submit.prevent="handleEmailSubmit" class="space-y-5 mb-6">
        <div v-if="isEmailMode === 'register'" class="space-y-2">
          <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">Full Name</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#40493d] dark:text-[#9ca3af] text-xl">person</span>
            <input v-model="emailForm.nama" type="text" placeholder="Your full name" class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-2 border-transparent rounded-xl pl-12 pr-5 py-4 focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all text-sm font-medium" required />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">Email</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#40493d] dark:text-[#9ca3af] text-xl">mail</span>
            <input v-model="emailForm.email" type="email" placeholder="student@school.edu" class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-2 border-transparent rounded-xl pl-12 pr-5 py-4 focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all text-sm font-medium" required />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">Password</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#40493d] dark:text-[#9ca3af] text-xl">lock</span>
            <input v-model="emailForm.password" type="password" placeholder="Min. 6 characters" class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-2 border-transparent rounded-xl pl-12 pr-5 py-4 focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all text-sm font-medium" required />
          </div>
        </div>
        <button type="submit" :disabled="isSubmitting" class="w-full py-4 bg-[#387b41] text-white rounded-xl font-bold text-sm hover:bg-[#2d6334] transition-all shadow-md active:scale-95 disabled:opacity-50">
          {{ isSubmitting ? 'Please wait...' : (isEmailMode === 'login' ? 'Sign In' : 'Create Account') }}
        </button>
        <div class="text-center">
          <button type="button" v-if="isEmailMode === 'login'" @click="isEmailMode = 'register'" class="text-sm text-[#387b41] font-bold hover:underline">Don't have an account? Register</button>
          <button type="button" v-else @click="isEmailMode = 'login'" class="text-sm text-[#387b41] font-bold hover:underline">Already have an account? Sign In</button>
        </div>
      </form>

      <!-- Status -->
      <div v-if="status" :class="['py-4 px-6 rounded-2xl text-center font-bold text-sm flex items-center justify-center gap-2 shadow-sm mt-6', statusType === 'success' ? 'bg-[#abf4ac] text-[#07521d]' : statusType === 'error' ? 'bg-[#fef2f2] text-[#ef4444]' : 'bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#40493d] dark:text-[#9ca3af]']">
        <span class="material-symbols-outlined text-xl">{{ statusType === 'success' ? 'check_circle' : statusType === 'error' ? 'error' : 'sync' }}</span>
        {{ status }}
      </div>

      <!-- QR result -->
      <div v-if="resultData" class="p-6 bg-[#f8faf7] dark:bg-[#121212] rounded-3xl border border-[#e0e4df] dark:border-[#374151] mt-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-white dark:bg-[#1e1e1e] flex items-center justify-center text-[#387b41] font-bold shadow-sm">{{ resultData.nama.charAt(0) }}</div>
          <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ resultData.nama }}</h3>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between text-xs"><span class="text-[#40493d] dark:text-[#9ca3af]">NISN</span><span class="font-bold">{{ resultData.nisn }}</span></div>
          <div class="flex justify-between text-xs"><span class="text-[#40493d] dark:text-[#9ca3af]">Jurusan</span><span class="font-bold">{{ resultData.jurusan }}</span></div>
        </div>
      </div>
    </div>
    <p class="mt-8 justify-center text-[11px] text-[#40493d] dark:text-[#9ca3af] font-medium uppercase tracking-[0.2em]">SMK Negeri 2 Depok Digital Service</p>
  </div>
</template>

<style scoped>
.qr-reader :deep(video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  transform: none !important;
  -webkit-transform: none !important;
}
</style>
