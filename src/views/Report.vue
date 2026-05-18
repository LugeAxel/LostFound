<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import LocationPicker from '../components/LocationPicker.vue';
import TopNav from '../components/TopNav.vue';
import SideNav from '../components/SideNav.vue';
import Footer from '../components/Footer.vue';
import { API_URL } from '@/config/api';
import { useToast } from '../composables/useToast';
import { getAuthHeaders } from '../composables/useAuth';
import { useI18n } from '../i18n';
import { supabase } from '../lib/supabase';

const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const areaCategories = [
  'Ruang Teori', 'Laboratorium', 'Masjid', 'Kantin', 'Koperasi',
  'Bima', 'Yudhistira', 'Arjuna', 'Lapangan', 'Kantor',
  'Parkir', 'Bengkel', 'Bangunan Kimia', 'Bangunan GP'
];

const form = ref({
  name: '',
  location: '',
  category: 'Electronics',
  area_category: '',
  type: 'found',
  description: '',
  imageUrl: '',
  coordinates: null as { latitude: number; longitude: number } | null
});

const isSubmitting = ref(false);
const isGettingLocation = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const imagePreview = ref<string | null>(null);

const isCameraOpen = ref(false);
const videoElement = ref<HTMLVideoElement | null>(null);
const facingMode = ref<'user' | 'environment'>('environment');
let stream: MediaStream | null = null;

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
    form.value.imageUrl = imagePreview.value;
    stopCamera();
  }
};

const retakePhoto = () => {
  imagePreview.value = null;
  form.value.imageUrl = '';
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

const getLiveLocation = () => {
  if (!navigator.geolocation) {
    toast.show('Geolocation is not supported by your browser', 'error');
    return;
  }

  isGettingLocation.value = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.value.coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      isGettingLocation.value = false;
      // Auto-fill location if it's empty
      if (!form.value.location) {
        form.value.location = `GPS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      }
    },
    (error) => {
      console.error('Error getting location:', error);
      toast.show('Unable to retrieve your location', 'error');
      isGettingLocation.value = false;
    }
  );
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.show('File too large. Please select an image smaller than 2MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
      form.value.imageUrl = imagePreview.value;
    };
    reader.readAsDataURL(file);
  }
};

const triggerFileInput = () => {
  if (fileInput.value) fileInput.value.click();
};

onBeforeUnmount(() => stopCamera());

const submitReport = async () => {
  if (!form.value.name || !form.value.location) {
    toast.show('Please fill in required fields', 'error');
    return;
  }
  if (!form.value.imageUrl && form.value.type === 'found') {
    toast.show('Please provide a photo of the found item (Direct Camera Required)', 'error');
    return;
  }

  isSubmitting.value = true;
  try {
    const formData = new FormData();
    formData.append('name', form.value.name);
    formData.append('location', form.value.location);
    formData.append('category', form.value.category);
    formData.append('area_category', form.value.area_category);
    formData.append('type', form.value.type);
    formData.append('description', form.value.description);

    if (form.value.coordinates && typeof form.value.coordinates.latitude === 'number' && typeof form.value.coordinates.longitude === 'number') {
      formData.append('coordinates', JSON.stringify({
        latitude: form.value.coordinates.latitude,
        longitude: form.value.coordinates.longitude
      }));
    }

    if (form.value.imageUrl) {
      try {
        const fetchRes = await fetch(form.value.imageUrl);
        const blob = await fetchRes.blob();
        formData.append('image', blob, 'item_photo.jpg');
      } catch (e) {
        console.error('Failed to convert image to blob', e);
      }
    }

    const authHeaders = await getAuthHeaders();
    await axios.post(`${API_URL}/api/items`, formData, { 
      headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' } 
    });
    toast.show('Report submitted successfully! You can find the claim QR code in "My Reports".', 'success');
    router.push('/my-reports');
  } catch (error: any) {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
      return;
    }
    console.error('Error submitting report:', error);
    toast.show(error.response?.data?.message || 'Failed to submit report', 'error');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex font-sans">
    <SideNav />
    <TopNav />

    <main class="md:ml-64 pt-24 px-4 sm:px-6 md:px-8 pb-12 w-full max-w-[1200px] mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] mb-8 transition-colors font-bold text-sm group">
        <span class="text-[#1c1b1b] dark:text-[#f3f4f6] material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        Back to Dashboard
      </button>

      <div class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] sm:rounded-[2.5rem] shadow-xl p-4 sm:p-8 md:p-10 border border-[#e0e4df] dark:border-[#374151] relative overflow-hidden">
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-[#387b41] opacity-5 rounded-full"></div>
        
        <h2 class="text-3xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2 tracking-tight">Create Report</h2>
        <p class="text-[#40493d] dark:text-[#9ca3af] mb-10 text-sm font-medium">Help the community find their belongings.</p>

        <form @submit.prevent="submitReport" class="space-y-5 sm:space-y-6 md:space-y-8 relative z-10">
          <!-- Type Toggle -->
          <div class="grid grid-cols-2 gap-4 p-1 bg-[#f3f5f2] dark:bg-[#2a2a2a] rounded-2xl">
            <button type="button" @click="form.type = 'found'; imagePreview = null; form.imageUrl = ''; stopCamera()"
              :class="['py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2', 
              form.type === 'found' ? 'bg-white dark:bg-[#1e1e1e] text-[#387b41] shadow-sm' : 'text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41]']">
              <span class="material-symbols-outlined text-xl">add_a_photo</span> Found
            </button>
            <button type="button" @click="form.type = 'lost'; imagePreview = null; form.imageUrl = ''; stopCamera()"
              :class="['py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2', 
              form.type === 'lost' ? 'bg-white dark:bg-[#1e1e1e] text-[#ba1a1a] shadow-sm' : 'text-[#40493d] dark:text-[#9ca3af] hover:text-[#ba1a1a]']">
              <span class="material-symbols-outlined text-xl">search</span> Lost
            </button>
          </div>

          <!-- Image Input -->
          <div class="space-y-3">
            <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">
              {{ form.type === 'found' ? 'Photo of Item (Direct Camera) *' : 'Photo of Item (Optional)' }}
            </label>
            <div class="relative w-full">
              <!-- Found Item Native Camera Interface -->
              <div v-if="form.type === 'found'" class="w-full">
                <div v-if="!imagePreview && !isCameraOpen" @click="startCamera" class="w-full aspect-video md:h-64 border-2 border-dashed border-[#e0e4df] dark:border-[#374151] rounded-3xl bg-[#f8faf7] dark:bg-[#121212] flex flex-col items-center justify-center gap-2 hover:bg-[#f3f5f2] dark:bg-[#2a2a2a] hover:border-[#387b41]/30 transition-all cursor-pointer">
                  <span class="material-symbols-outlined text-4xl text-[#40493d] dark:text-[#9ca3af]/40">photo_camera</span>
                  <p class="text-xs font-bold text-[#40493d] dark:text-[#9ca3af]">Click to Open Camera</p>
                  <p class="text-[10px] text-[#387b41] font-bold">REQUIRED FOR FOUND ITEMS</p>
                </div>
                
                <div v-show="isCameraOpen && !imagePreview" class="relative w-full h-64 rounded-3xl overflow-hidden shadow-md border border-[#e0e4df] dark:border-[#374151] bg-black">
                  <video ref="videoElement" autoplay playsinline class="w-full h-full object-cover"></video>
                  <button @click.prevent="takePhoto" type="button" class="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white dark:bg-[#1e1e1e] rounded-full border-4 border-[#387b41] shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
                    <div class="w-12 h-12 rounded-full border-2 border-[#e0e4df] dark:border-[#374151]"></div>
                  </button>
                  <button @click.prevent="switchCamera" type="button" class="absolute top-4 left-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md hover:bg-black/70">
                    <span class="material-symbols-outlined text-sm">flip_camera_android</span>
                  </button>
                  <button @click.prevent="stopCamera" type="button" class="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md hover:bg-black/70">
                    <span class="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <div v-if="imagePreview" class="relative w-full h-64 rounded-3xl overflow-hidden shadow-md border border-[#e0e4df] dark:border-[#374151]">
                  <img :src="imagePreview" class="w-full h-full object-cover" />
                  <button @click.prevent="retakePhoto" type="button" class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg text-sm font-bold text-[#1c1b1b] dark:text-[#f3f4f6] flex items-center gap-2 hover:bg-white dark:bg-[#1e1e1e] transition-all">
                    <span class="material-symbols-outlined text-lg">refresh</span> Retake Photo
                  </button>
                </div>
              </div>

              <!-- Lost Item File Upload Interface -->
              <div v-else @click="triggerFileInput" class="w-full relative group cursor-pointer">
                <div v-if="!imagePreview" class="w-full aspect-video md:h-64 border-2 border-dashed border-[#e0e4df] dark:border-[#374151] rounded-3xl bg-[#f8faf7] dark:bg-[#121212] flex flex-col items-center justify-center gap-2 group-hover:bg-[#f3f5f2] dark:bg-[#2a2a2a] group-hover:border-[#387b41]/30 transition-all">
                  <span class="material-symbols-outlined text-4xl text-[#40493d] dark:text-[#9ca3af]/40">upload_file</span>
                  <p class="text-xs font-bold text-[#40493d] dark:text-[#9ca3af]">Click to Upload</p>
                  <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af]/50">Will use default icon if empty</p>
                </div>
                <div v-else class="w-full h-64 rounded-3xl overflow-hidden shadow-md border border-[#e0e4df] dark:border-[#374151]">
                  <img :src="imagePreview" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p class="text-white font-bold text-sm">Change Photo</p>
                  </div>
                </div>
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
              </div>
            </div>
          </div>

          <!-- Details -->
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">Item Name *</label>
              <input v-model="form.name" type="text" placeholder="e.g. Blue Hydroflask, MacBook Air" 
                class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-2 border-transparent rounded-xl px-5 py-4 focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all text-sm font-medium" required />
            </div>
            
            <!-- Live Location Section -->
            <div class="space-y-3">
              <div class="flex justify-between items-center px-1">
                <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] uppercase tracking-wider">Location *</label>
                <button type="button" @click="getLiveLocation" :disabled="isGettingLocation"
                  class="flex items-center gap-1 text-[10px] font-bold text-[#387b41] hover:underline disabled:opacity-50">
                  <span class="material-symbols-outlined text-sm">{{ isGettingLocation ? 'sync' : 'my_location' }}</span>
                  {{ isGettingLocation ? 'Getting location...' : 'Use Live Location' }}
                </button>
              </div>
              <div class="relative">
                <input v-model="form.location" type="text" placeholder="e.g. Lab 3, Library" 
                  class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-2 border-transparent rounded-xl px-5 py-4 pl-12 focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all text-sm font-medium" required />
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#40493d] dark:text-[#9ca3af]">location_on</span>
              </div>
              <div v-if="form.coordinates" class="space-y-2">
                <div class="flex justify-between items-center px-1">
                  <p class="text-[10px] text-[#387b41] font-bold flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">gps_fixed</span> Coordinates attached
                  </p>
                  <button type="button" @click="form.coordinates = null" class="text-[10px] font-bold text-[#ba1a1a] hover:underline flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">close</span> Clear pin
                  </button>
                </div>
                <LocationPicker v-model="form.coordinates" />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">Category</label>
              <div class="relative">
                <select v-model="form.category" class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white border-2 border-transparent rounded-xl px-5 py-4 focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all text-sm font-medium appearance-none">
                  <option>Electronics</option>
                  <option>Daily Use</option>
                  <option>Clothing</option>
                  <option>Books/Stationery</option>
                  <option>Others</option>
                </select>
                <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#40493d] dark:text-[#9ca3af]">expand_more</span>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">Area Category</label>
              <div class="relative">
                <select v-model="form.area_category" class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white border-2 border-transparent rounded-xl px-5 py-4 focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all text-sm font-medium appearance-none">
                  <option value="">Select area (optional)</option>
                  <option v-for="area in areaCategories" :key="area" :value="area">{{ t('area.' + area) }}</option>
                </select>
                <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#40493d] dark:text-[#9ca3af]">expand_more</span>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6] px-1 uppercase tracking-wider">Description</label>
              <textarea v-model="form.description" rows="3" placeholder="Color, brand, or other identifying features..." 
                class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-2 border-transparent rounded-xl px-5 py-4 focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all text-sm font-medium resize-none"></textarea>
            </div>
          </div>

          <button type="submit" :disabled="isSubmitting"
            :class="['w-full py-5 rounded-[1.25rem] font-bold text-base transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white', 
            form.type === 'found' ? 'bg-[#387b41] hover:bg-[#2d6334]' : 'bg-[#ba1a1a] hover:bg-[#961515]']">
            {{ isSubmitting ? 'Submitting...' : 'Submit Report' }}
          </button>
        </form>
      </div>
      <Footer />
    </main>
    </div>
</template>

