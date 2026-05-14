<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Html5QrcodeScanner } from 'html5-qrcode';

const router = useRouter();
const scanner = ref<Html5QrcodeScanner | null>(null);

onMounted(() => {
  scanner.value = new Html5QrcodeScanner(
    "qr-reader",
    { fps: 10, qrbox: { width: 250, height: 250 } },
    /* verbose= */ false
  );
  
  scanner.value.render((decodedText) => {
    // Check if the decoded text is a URL or just an ID
    // If it's a URL, extract the ID or just navigate
    if (decodedText.includes('/claim/')) {
      const url = new URL(decodedText);
      router.push(url.pathname);
    } else {
      // Assume it's an ID
      router.push(`/claim/${decodedText}`);
    }
    
    if (scanner.value) {
      scanner.value.clear();
    }
  }, (errorMessage) => {
    // console.warn(`QR Code no longer in front of camera: ${errorMessage}`);
  });
});

onUnmounted(() => {
  if (scanner.value) {
    scanner.value.clear();
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] shadow-xl p-4 md:p-8 border border-[#e0e4df] dark:border-[#374151] text-center">
      <h2 class="text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2">Scan QR Code</h2>
      <p class="text-sm text-[#40493d] dark:text-[#9ca3af] mb-8">Scan the reporter's QR code to claim your item.</p>
      
      <div class="flex justify-center mb-6">
        <div class="w-24 h-24 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-full flex items-center justify-center text-[#387b41]">
          <span class="material-symbols-outlined text-5xl">qr_code_2</span>
        </div>
      </div>
      
      <div id="qr-reader" class="overflow-hidden rounded-3xl border-2 border-[#e0e4df] dark:border-[#374151]"></div>
      
      <button @click="router.back()" class="mt-8 px-8 py-3 bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#1c1b1b] dark:text-[#f3f4f6] rounded-xl font-bold hover:bg-[#e0e4df] transition-all">
        Back to Dashboard
      </button>
    </div>
  </div>
</template>

<style>
#qr-reader {
  border: none !important;

}
#qr-reader__dashboard_section_csr button {
  background-color: #387b41 !important;
  color: white !important;
  border: none !important;
  padding: 10px 20px !important;
  border-radius: 12px !important;
  font-weight: bold !important;
  cursor: pointer !important;
}
</style>
