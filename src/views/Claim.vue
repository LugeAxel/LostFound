<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { API_URL } from '@/config/api';
import { useToast } from '../composables/useToast';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const itemId = route.params.id as string;

const item = ref<any>(null);
const isLoading = ref(true);
const isSubmitting = ref(false);
const imagePreview = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const isCameraOpen = ref(false);
const videoElement = ref<HTMLVideoElement | null>(null);
const facingMode = ref<'user' | 'environment'>('user');
let stream: MediaStream | null = null;

const form = ref({
  claimNotes: '',
  claimPhoto: ''
});

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchItemDetails = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/items/${itemId}`, { headers: getAuthHeaders() });
    item.value = res.data;
  } catch (error: any) {
    console.error('Error fetching item:', error);
    toast.show(error.response?.data?.message || 'Item not found', 'error');
    router.push('/dashboard');
  } finally {
    isLoading.value = false;
  }
};

const startCamera = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode.value } });
    if (videoElement.value) {
      videoElement.value.srcObject = stream;
    }
    isCameraOpen.value = true;
    imagePreview.value = null;
  } catch (error) {
    console.error('Error accessing camera:', error);
    toast.show('Unable to access camera. Please allow camera permissions.', 'error');
  }
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  isCameraOpen.value = false;
};

const takePhoto = () => {
  if (!videoElement.value) return;
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.value.videoWidth;
  canvas.height = videoElement.value.videoHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height);
    imagePreview.value = canvas.toDataURL('image/jpeg', 0.8);
    form.value.claimPhoto = imagePreview.value;
    stopCamera();
  }
};

const retakePhoto = () => {
  imagePreview.value = null;
  form.value.claimPhoto = '';
  startCamera();
};

const switchCamera = async () => {
  const prevFacing = facingMode.value;
  facingMode.value = facingMode.value === 'user' ? 'environment' : 'user';
  stopCamera();
  await startCamera();
  if (!isCameraOpen.value) {
    facingMode.value = prevFacing;
  }
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
      form.value.claimPhoto = imagePreview.value;
      stopCamera();
    };
    reader.readAsDataURL(file);
  }
};

const submitClaim = async () => {
  if (!form.value.claimPhoto) {
    toast.show('Please provide a verification photo (You with the item)', 'error');
    return;
  }

  isSubmitting.value = true;
  try {
    await axios.post(`${API_URL}/api/items/${itemId}/claim`, {
      claimNotes: form.value.claimNotes,
      claimPhoto: form.value.claimPhoto
    }, { headers: getAuthHeaders() });
    
    toast.show('Claim submitted successfully! The item is now marked as Returned.', 'success');
    router.push('/dashboard');
  } catch (error: any) {
    console.error('Error submitting claim:', error);
    toast.show(error.response?.data?.message || 'Failed to submit claim', 'error');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(fetchItemDetails);

onBeforeUnmount(() => {
  stopCamera();
});
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] p-3 sm:p-4 md:p-8 font-sans">
    <div class="max-w-2xl mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] mb-8 transition-colors font-bold text-sm group">
        <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        Cancel Claim
      </button>

      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
      </div>

      <div v-else-if="item" class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] sm:rounded-[2.5rem] shadow-xl p-4 sm:p-8 md:p-10 border border-[#e0e4df] dark:border-[#374151] relative overflow-hidden">
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-[#387b41] opacity-5 rounded-full"></div>
        
        <header class="mb-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-[#f0fdf4] text-[#387b41] rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
            <span class="material-symbols-outlined text-sm">verified_user</span> Verification Required
          </div>
          <h2 class="text-3xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2 tracking-tight">Claim Item: {{ item.name }}</h2>
          <p class="text-[#40493d] dark:text-[#9ca3af] text-sm font-medium">Please provide proof that you have received this item.</p>
        </header>

        <div class="mb-10 p-4 md:p-6 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-3xl border border-[#e0e4df] dark:border-[#374151] flex gap-4 md:gap-6 items-center">
          <img :src="item.imageUrl || 'https://placehold.co/400x300/f3f5f2/40493d?text=No+Image'" class="w-24 h-24 rounded-2xl object-cover border border-white shadow-sm" />
          <div>
            <h4 class="font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ item.name }}</h4>
            <p class="text-xs text-[#40493d] dark:text-[#9ca3af] mt-1">{{ item.location }}</p>
            <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af]/60 mt-2 italic">Reported by {{ item.reporter?.nama || 'Anonymous' }}</p>
          </div>
        </div>

        <form @submit.prevent="submitClaim" class="space-y-8 relative z-10">
          <div class="space-y-3">
            <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">
              Verification Photo (Owner with Item) *
            </label>
            <!-- Idle: no photo, no camera -->
            <div v-if="!imagePreview && !isCameraOpen" @click="startCamera"
              class="w-full h-48 border-2 border-dashed border-[#e0e4df] dark:border-[#374151] rounded-3xl bg-[#f8faf7] dark:bg-[#121212] flex flex-col items-center justify-center gap-2 hover:bg-[#f3f5f2] dark:hover:bg-[#2a2a2a] hover:border-[#387b41]/30 transition-all cursor-pointer">
              <span class="material-symbols-outlined text-4xl text-[#40493d] dark:text-[#9ca3af]/40">photo_camera</span>
              <p class="text-xs font-bold text-[#40493d] dark:text-[#9ca3af]">Open Camera</p>
              <p class="text-[10px] text-[#387b41] font-bold">REQUIRED FOR VERIFICATION</p>
            </div>

            <!-- Camera live preview -->
            <div v-show="isCameraOpen && !imagePreview" class="relative w-full h-64 rounded-3xl overflow-hidden shadow-md border border-[#e0e4df] dark:border-[#374151] bg-black">
              <video ref="videoElement" autoplay playsinline class="w-full h-full object-cover"></video>

              <!-- Capture button -->
              <button @click.prevent="takePhoto" type="button"
                class="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white dark:bg-[#1e1e1e] rounded-full border-4 border-[#387b41] shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-10">
                <div class="w-12 h-12 rounded-full border-2 border-[#e0e4df] dark:border-[#374151]"></div>
              </button>

              <!-- Switch camera -->
              <button @click.prevent="switchCamera" type="button"
                class="absolute top-4 left-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md hover:bg-black/70 z-10">
                <span class="material-symbols-outlined text-sm">flip_camera_android</span>
              </button>

              <!-- Close -->
              <button @click.prevent="stopCamera" type="button"
                class="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md hover:bg-black/70 z-10">
                <span class="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <!-- Preview -->
            <div v-if="imagePreview" class="relative w-full h-64 rounded-3xl overflow-hidden shadow-md border border-[#e0e4df] dark:border-[#374151]">
              <img :src="imagePreview" class="w-full h-full object-cover" />
              <button @click.prevent="retakePhoto" type="button"
                class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6] flex items-center gap-2 hover:bg-white dark:bg-[#1e1e1e] transition-all z-10">
                <span class="material-symbols-outlined text-lg">refresh</span> Retake Photo
              </button>
            </div>

            <!-- Fallback file upload link -->
            <div v-if="!imagePreview && !isCameraOpen" class="text-center mt-2">
              <button @click="fileInput?.click()" type="button"
                class="text-[10px] text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] underline transition-colors">
                or upload from gallery
              </button>
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">Additional Notes (Optional)</label>
            <textarea v-model="form.claimNotes" rows="3" placeholder="Any details about the handover..." 
              class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-2 border-transparent rounded-xl px-5 py-4 focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all text-sm font-medium resize-none"></textarea>
          </div>

          <button type="submit" :disabled="isSubmitting"
            class="w-full py-5 bg-[#387b41] hover:bg-[#2d6334] text-white rounded-[1.25rem] font-bold text-base transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
            {{ isSubmitting ? 'Verifying...' : 'Complete Claim' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
