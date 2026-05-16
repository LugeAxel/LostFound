<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import { useI18n } from '../i18n';
import { useToast } from '../composables/useToast';
import { DotLottieVue } from '@lottiefiles/dotlottie-vue';

const router = useRouter();
const { t } = useI18n();
const toast = useToast();

let scanner: Html5Qrcode | null = null;
let scanLocked = false;

const isStarting = ref(true);
const error = ref<string | null>(null);
const hasTorch = ref(false);
const torchOn = ref(false);
const scanSuccess = ref(false);
const manualId = ref('');
const cameras = ref<{ id: string; label: string }[]>([]);
const selectedCameraIndex = ref(0);
const isMounted = ref(true);
const isDecodingImage = ref(false);

async function initCamera() {
  if (!isMounted.value) return;
  isStarting.value = true;
  error.value = null;
  scanSuccess.value = false;
  scanLocked = false;

  try {
    await nextTick();
    if (!isMounted.value) return;

    const allCameras = await Html5Qrcode.getCameras();
    if (!isMounted.value) return;

    if (!allCameras || allCameras.length === 0) {
      throw new Error('NO_CAMERA');
    }

    cameras.value = allCameras;
    const backIdx = allCameras.findIndex(c =>
      c.label.toLowerCase().includes('back') ||
      c.label.toLowerCase().includes('environment')
    );
    selectedCameraIndex.value = backIdx >= 0 ? backIdx : 0;

    const cam = allCameras[selectedCameraIndex.value];
    if (!cam) throw new Error('NO_CAMERA');
    await startCamera(cam.id);
  } catch (e: any) {
    if (isMounted.value) handleError(e);
  }
}

async function startCamera(cameraId: string) {
  if (!isMounted.value) return;

  if (scanner) {
    try { await scanner.stop(); } catch { /* ignore */ }
  }

  scanner = new Html5Qrcode('qr-reader', {
    verbose: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
  });
  await scanner.start(
    cameraId,
    {
      fps: 5,
      qrbox: { width: 280, height: 280 },
      aspectRatio: 1
    },
    onScanSuccess,
    () => { /* ignore scan errors */ }
  );

  if (!isMounted.value) return;
  isStarting.value = false;

  try {
    const caps = scanner.getRunningTrackCameraCapabilities();
    hasTorch.value = caps.torchFeature().isSupported();
  } catch {
    hasTorch.value = false;
  }
}

function onScanSuccess(decodedText: string) {
  if (scanLocked || !isMounted.value) return;
  scanLocked = true;
  scanSuccess.value = true;

  setTimeout(() => {
    if (isMounted.value) navigateToClaim(decodedText);
  }, 800);
}

function navigateToClaim(decodedText: string) {
  try {
    if (decodedText.includes('/claim/')) {
      let path = decodedText;
      try { path = new URL(decodedText).pathname; } catch { /* not a full URL */ }
      router.push(path);
    } else {
      router.push(`/claim/${decodedText.trim()}`);
    }
  } catch (e) {
    console.error('Navigation error:', e);
  }
}

function handleError(e: any) {
  console.error('Scanner error:', e);
  isStarting.value = false;
  const msg = e?.message || '';
  if (msg.includes('NotAllowedError') || msg.includes('permission')) {
    error.value = 'scanner.error_permission';
  } else if (msg.includes('NotFoundError') || msg === 'NO_CAMERA') {
    error.value = 'scanner.error_not_found';
  } else {
    error.value = 'scanner.error_unknown';
  }
}

async function switchCamera() {
  if (cameras.value.length < 2) return;
  const nextIdx = (selectedCameraIndex.value + 1) % cameras.value.length;
  selectedCameraIndex.value = nextIdx;
  isStarting.value = true;
  try {
    const nextCam = cameras.value[nextIdx];
    if (!nextCam) return;
    await startCamera(nextCam.id);
  } catch (e: any) {
    if (isMounted.value) handleError(e);
  }
}

async function toggleTorch() {
  if (!scanner || !hasTorch.value) return;
  try {
    const caps = scanner.getRunningTrackCameraCapabilities();
    if (torchOn.value) {
      await caps.torchFeature().apply(false);
    } else {
      await caps.torchFeature().apply(true);
    }
    torchOn.value = !torchOn.value;
  } catch { /* torch toggle failed */ }
}

function handleManualSubmit() {
  const id = manualId.value.trim();
  if (id) navigateToClaim(id);
}

function retry() {
  initCamera();
}

const fileInput = ref<HTMLInputElement | null>(null);

async function decodeQrFromImage(file: File) {
  if (!file) return;
  isDecodingImage.value = true;
  try {
    const codeScanner = new Html5Qrcode('qr-decoder-image');
    const result = await codeScanner.scanFile(file, true);
    codeScanner.clear();
    if (result && !scanLocked) {
      scanLocked = true;
      scanSuccess.value = true;
      setTimeout(() => {
        if (isMounted.value) navigateToClaim(result);
      }, 800);
    }
  } catch (e) {
    toast.show('Could not detect a QR code in this image. Try a clearer photo.', 'error');
  } finally {
    isDecodingImage.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

function triggerFileUpload() {
  if (fileInput.value) fileInput.value.click();
}

function onFileSelected() {
  const file = fileInput.value?.files?.[0];
  if (file) decodeQrFromImage(file);
}

onMounted(initCamera);

onUnmounted(() => {
  isMounted.value = false;
  if (scanner) {
    try { scanner.stop(); } catch { /* ignore */ }
    scanner = null;
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex pb-20">
    <SideNav />
    <TopNav />

    <main class="md:ml-64 pt-24 px-4 sm:px-6 md:px-8 pb-12 w-full max-w-[1200px] mx-auto">
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] tracking-tight">{{ t('scanner.title') }}</h2>
        <p class="text-[#40493d] dark:text-[#9ca3af] text-sm mt-1">{{ t('scanner.subtitle') }}</p>
      </div>

      <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-4 md:p-6 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <!-- Camera Column -->
          <div class="lg:col-span-3 relative min-h-[340px]">
            <!-- Scanner container - always in DOM so #qr-reader exists -->
            <div class="relative overflow-hidden rounded-2xl bg-black" style="min-height:300px">
              <div id="qr-reader"></div>
              <div id="qr-decoder-image" class="hidden"></div>

              <!-- Scan frame overlay (only when camera active) -->
              <div v-if="!isStarting && !error" class="absolute inset-0 pointer-events-none z-10">
                <div class="absolute top-3 left-3 w-10 h-10 border-t-4 border-l-4 border-[#88d982] rounded-tl-xl"></div>
                <div class="absolute top-3 right-3 w-10 h-10 border-t-4 border-r-4 border-[#88d982] rounded-tr-xl"></div>
                <div class="absolute bottom-3 left-3 w-10 h-10 border-b-4 border-l-4 border-[#88d982] rounded-bl-xl"></div>
                <div class="absolute bottom-3 right-3 w-10 h-10 border-b-4 border-r-4 border-[#88d982] rounded-br-xl"></div>
                <div class="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[#88d982] to-transparent animate-scan-line"></div>
              </div>

              <!-- Success overlay -->
              <div v-if="scanSuccess" class="absolute inset-0 bg-[#387b41]/90 z-20 flex flex-col items-center justify-center rounded-2xl">
                <span class="material-symbols-outlined text-6xl text-white animate-success-icon">check_circle</span>
                <p class="text-white font-bold text-lg mt-3">{{ t('scanner.scan_success') }}</p>
              </div>
            </div>

            <!-- Loading overlay -->
            <div v-if="isStarting" class="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[#f8faf7] dark:bg-[#121212] z-30">
              <div class="w-10 h-10 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
              <p class="mt-4 text-sm text-[#40493d] dark:text-[#9ca3af]">{{ t('scanner.starting_camera') }}</p>
            </div>

            <!-- Error overlay -->
            <div v-else-if="error" class="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-[#f8faf7] dark:bg-[#121212] z-30">
              <span class="material-symbols-outlined text-6xl text-[#ba1a1a] mb-4">report</span>
              <p class="text-sm text-[#40493d] dark:text-[#9ca3af] mb-4 text-center max-w-xs">{{ t(error) }}</p>
              <button @click="retry"
                class="px-6 py-2.5 bg-[#387b41] text-white rounded-xl font-bold text-sm hover:bg-[#2d6334] transition-all active:scale-95 shadow-sm">
                {{ t('scanner.retry') }}
              </button>
            </div>

            <!-- Camera controls -->
            <div v-if="!isStarting && !error" class="flex justify-center gap-3 mt-4">
              <button v-if="hasTorch"
                @click="toggleTorch"
                class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#40493d] dark:text-[#9ca3af] hover:bg-[#e0e4df] dark:hover:bg-[#333] transition-all active:scale-95">
                <span class="material-symbols-outlined text-base">{{ torchOn ? 'flashlight_on' : 'flashlight_off' }}</span>
                {{ torchOn ? t('scanner.torch_on') : t('scanner.torch_off') }}
              </button>
              <button v-if="cameras.length > 1" @click="switchCamera"
                class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-[#f3f5f2] dark:bg-[#2a2a2a] text-[#40493d] dark:text-[#9ca3af] hover:bg-[#e0e4df] dark:hover:bg-[#333] transition-all active:scale-95">
                <span class="material-symbols-outlined text-base">flip_camera_android</span>
                {{ t('scanner.switch_camera') }}
              </button>
            </div>
          </div>

          <!-- Side Panel -->
          <div class="lg:col-span-2 space-y-5">
            <!-- Manual Input -->
            <div class="bg-[#f8faf7] dark:bg-[#121212] rounded-xl p-5 border border-[#e0e4df] dark:border-[#374151]">
              <div class="flex items-center gap-3 mb-4">
                <div class="h-px flex-1 bg-[#e0e4df] dark:bg-[#374151]"></div>
                <span class="text-xs text-[#40493d] dark:text-[#9ca3af] font-medium uppercase tracking-wider">{{ t('scanner.or_manual') }}</span>
                <div class="h-px flex-1 bg-[#e0e4df] dark:bg-[#374151]"></div>
              </div>
              <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2 block">{{ t('scanner.manual_label') }}</label>
              <div class="flex gap-2">
                <input v-model="manualId" @keyup.enter="handleManualSubmit" type="text"
                  :placeholder="t('scanner.manual_placeholder')"
                  class="flex-1 bg-white dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border border-[#e0e4df] dark:border-[#374151] rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#387b41] outline-none" />
                <button @click="handleManualSubmit" :disabled="!manualId.trim()"
                  class="px-5 py-2.5 bg-[#387b41] disabled:bg-[#a3c9a8] text-white rounded-xl font-bold text-sm hover:bg-[#2d6334] transition-all active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed shadow-sm">
                  {{ t('scanner.manual_submit') }}
                </button>
              </div>
            </div>

            <!-- QR from Image Upload -->
            <div class="bg-[#f8faf7] dark:bg-[#121212] rounded-xl p-5 border border-[#e0e4df] dark:border-[#374151]">
              <div class="flex items-center gap-3 mb-4">
                <div class="h-px flex-1 bg-[#e0e4df] dark:bg-[#374151]"></div>
                <span class="text-xs text-[#40493d] dark:text-[#9ca3af] font-medium uppercase tracking-wider">{{ t('scanner.or_image') }}</span>
                <div class="h-px flex-1 bg-[#e0e4df] dark:bg-[#374151]"></div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelected" />
              <button @click="triggerFileUpload" :disabled="isDecodingImage"
                class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#f3f5f2] dark:bg-[#2a2a2a] border-2 border-dashed border-[#e0e4df] dark:border-[#374151] rounded-xl text-xs font-bold text-[#40493d] dark:text-[#9ca3af] hover:border-[#387b41] hover:text-[#387b41] transition-all disabled:opacity-50">
                <span class="material-symbols-outlined text-base">{{ isDecodingImage ? 'sync' : 'image' }}</span>
                {{ isDecodingImage ? t('scanner.decoding') : t('scanner.upload_qr') }}
              </button>
            </div>

            <!-- How To -->
            <div class="bg-[#f8faf7] dark:bg-[#121212] rounded-xl p-5 border border-[#e0e4df] dark:border-[#374151]">
              
              <h3 class="font-bold text-sm text-[#1c1b1b] dark:text-[#f3f4f6] flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-[#387b41]">help</span>
                {{ t('scanner.how_title') }}
              </h3>
              <DotLottieVue src="/animations/qranimation.json" :autoplay="true" :loop="true" style="width:150px;height:150px" class="" />
              <ol class="space-y-3">
                <li v-for="(step, i) in [t('scanner.how_step1'), t('scanner.how_step2'), t('scanner.how_step3'), t('scanner.how_step4')]" :key="i"
                  class="flex gap-3 text-xs text-[#40493d] dark:text-[#9ca3af] leading-relaxed">
                  <span class="w-5 h-5 rounded-full bg-[#387b41]/10 text-[#387b41] flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">{{ i + 1 }}</span>
                  <span>{{ step }}</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
#qr-reader {
  border: none !important;
  background: #ffffff !important;
}

#qr-reader video {
  border-radius: 1rem !important;
  background: #ffffff !important;
}

#qr-reader img {
  background: #ffffff !important;
}

@keyframes scan-line {
  0%, 100% { top: 5%; }
  50% { top: 85%; }
}

.animate-scan-line {
  animation: scan-line 2.5s ease-in-out infinite;
}

@keyframes success-icon {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-success-icon {
  animation: success-icon 0.4s ease-out forwards;
}
</style>