<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const status = ref('Menunggu scan...');
const statusType = ref('info');
const resultData = ref<any>(null);
const lastScan = ref('');
let html5QrCode: Html5Qrcode | null = null;

const setStatus = (message: string, type: string = 'info') => {
  status.value = message;
  statusType.value = type;
};

const onScanSuccess = async (decodedText: string) => {
  if (decodedText === lastScan.value) return;
  lastScan.value = decodedText;

  try {
    const lines = decodedText.trim().split("\t").map(line => line.trim());
    if (lines.length < 6) throw new Error("Jumlah baris QR tidak lengkap");
    
    const nisLine = lines[1];
    if (!nisLine) throw new Error("Baris NIS/NISN tidak ditemukan");

    const nisData = nisLine.split("/");
    if (nisData.length < 2) throw new Error("Format NIS/NISN salah");

    const data = {
      nama: lines[0] || 'Unknown',
      nisn: nisData[0],
      nis: nisData[1],
      jurusan: lines[2],
      ttl: lines[3],
      agama: lines[4],
      gender: lines[5]
    };

    resultData.value = data;
    setStatus("QR berhasil dibaca!", "success");

    // Send to backend
    const apiUrl = (import.meta as any).env.VITE_API_URL;
    console.log("Sending login request to backend...", data);
    const response = await axios.post(`${apiUrl}/api/login`, resultData.value);
    console.log("Backend response:", response.data);
    
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setStatus("Login berhasil! Mengalihkan...", "success");
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } else {
      throw new Error(response.data.message || "Login gagal");
    }
  } catch (err: any) {
    console.error("Login Error:", err);
    if (err.response) {
      console.error("Error Response Data:", err.response.data);
      setStatus(err.response.data.message || "Server Error", "error");
    } else {
      setStatus(err.message || "Format QR tidak sesuai", "error");
    }
  }
};

onMounted(() => {
  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    onScanSuccess,
    () => {}
  ).catch(err => {
    setStatus("Camera gagal diakses", "error");
    console.error(err);
  });
});

onUnmounted(() => {
  if (html5QrCode) {
    html5QrCode.stop().catch(err => console.error(err));
  }
});
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-outline-variant">
      <div class="flex flex-col items-center mb-8">
        <div class="w-20 h-20 bg-primary-container rounded-2xl flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-4xl text-primary">qr_code_scanner</span>
        </div>
        <h2 class="text-headline-md font-bold text-on-surface">Scan Kartu Siswa</h2>
        <p class="text-body-md text-on-surface-variant text-center mt-2">Arahkan kamera ke QR Code di kartu siswa Anda untuk masuk.</p>
      </div>

      <div id="reader" class="overflow-hidden rounded-2xl border-4 border-primary/20 bg-black aspect-square w-full max-w-[300px] mx-auto mb-6"></div>

      <div class="space-y-4">
        <div :class="['p-4 rounded-xl text-center font-bold text-sm transition-all', 
          statusType === 'success' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' : 
          statusType === 'error' ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface-variant']">
          {{ status }}
        </div>

        <div v-if="resultData" class="p-6 bg-surface-container-low rounded-2xl border border-outline-variant animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 class="text-headline-sm font-bold text-primary mb-4">{{ resultData.nama }}</h3>
          <div class="grid grid-cols-2 gap-y-3 text-sm">
            <p class="text-on-surface-variant">NISN</p>
            <p class="text-on-surface font-bold">{{ resultData.nisn }}</p>
            <p class="text-on-surface-variant">Jurusan</p>
            <p class="text-on-surface font-bold">{{ resultData.jurusan }}</p>
            <p class="text-on-surface-variant">Gender</p>
            <p class="text-on-surface font-bold">{{ resultData.gender }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-8 text-center">
      <p class="text-label-sm text-on-surface-variant">LostFound System • SMKN 2 Depok</p>
    </div>
  </div>
</template>

<style scoped>
#reader :deep(video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}
</style>
