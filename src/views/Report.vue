<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();

const form = ref({
  name: '',
  location: '',
  category: 'Electronics',
  type: 'Found',
  description: '',
  imageUrl: ''
});

const isSubmitting = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const imagePreview = ref<string | null>(null);

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Please select an image smaller than 2MB.');
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

const submitReport = async () => {
  if (!form.value.name || !form.value.location) {
    alert('Please fill in required fields');
    return;
  }
  if (!form.value.imageUrl && form.value.type === 'Found') {
    alert('Please provide a photo of the found item');
    return;
  }

  isSubmitting.value = true;
  try {
    const apiUrl = (import.meta as any).env.VITE_API_URL;
    // No longer sending reporter from client — backend uses JWT to determine user
    await axios.post(`${apiUrl}/api/items`, {
      name: form.value.name,
      location: form.value.location,
      category: form.value.category,
      type: form.value.type,
      description: form.value.description,
      imageUrl: form.value.imageUrl
    }, { headers: getAuthHeaders() });
    alert('Report submitted successfully! You can find the claim QR code in "My Reports".');
    router.push('/my-reports');
  } catch (error: any) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
      return;
    }
    console.error('Error submitting report:', error);
    alert(error.response?.data?.message || 'Failed to submit report');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] p-6 md:p-12 font-sans">
    <div class="max-w-2xl mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-[#40493d] hover:text-[#387b41] mb-8 transition-colors font-bold text-sm group">
        <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        Back to Dashboard
      </button>

      <div class="bg-white rounded-[2.5rem] shadow-xl p-8 md:p-12 border border-[#e0e4df] relative overflow-hidden">
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-[#387b41] opacity-5 rounded-full"></div>
        
        <h2 class="text-3xl font-bold text-[#1c1b1b] mb-2 tracking-tight">Create Report</h2>
        <p class="text-[#40493d] mb-10 text-sm font-medium">Help the community find their belongings.</p>

        <form @submit.prevent="submitReport" class="space-y-8 relative z-10">
          <!-- Type Toggle -->
          <div class="grid grid-cols-2 gap-4 p-1 bg-[#f3f5f2] rounded-2xl">
            <button type="button" @click="form.type = 'Found'; imagePreview = null; form.imageUrl = ''"
              :class="['py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2', 
              form.type === 'Found' ? 'bg-white text-[#387b41] shadow-sm' : 'text-[#40493d] hover:text-[#387b41]']">
              <span class="material-symbols-outlined text-xl">add_a_photo</span> Found
            </button>
            <button type="button" @click="form.type = 'lost'; imagePreview = null; form.imageUrl = ''"
              :class="['py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2', 
              form.type === 'lost' ? 'bg-white text-[#ba1a1a] shadow-sm' : 'text-[#40493d] hover:text-[#ba1a1a]']">
              <span class="material-symbols-outlined text-xl">search</span> Lost
            </button>
          </div>

          <!-- Image Input -->
          <div class="space-y-3">
            <label class="text-xs font-bold text-[#1c1b1b] px-1 uppercase tracking-wider">
              {{ form.type === 'Found' ? 'Photo of Item (Direct Camera) *' : 'Photo of Item (Optional)' }}
            </label>
            <div @click="triggerFileInput" class="relative group cursor-pointer">
              <div v-if="!imagePreview" class="w-full h-48 border-2 border-dashed border-[#e0e4df] rounded-3xl bg-[#f8faf7] flex flex-col items-center justify-center gap-2 group-hover:bg-[#f3f5f2] group-hover:border-[#387b41]/30 transition-all">
                <span class="material-symbols-outlined text-4xl text-[#40493d]/40">{{ form.type === 'Found' ? 'photo_camera' : 'upload_file' }}</span>
                <p class="text-xs font-bold text-[#40493d]">{{ form.type === 'Found' ? 'Click to Open Camera' : 'Click to Upload' }}</p>
              </div>
              <div v-else class="w-full h-64 rounded-3xl overflow-hidden shadow-md border border-[#e0e4df]">
                <img :src="imagePreview" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p class="text-white font-bold text-sm">Change Photo</p>
                </div>
              </div>
              <input v-if="form.type === 'Found'" ref="fileInput" type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileUpload" />
              <input v-else ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
            </div>
          </div>

          <!-- Details -->
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="text-xs font-bold text-[#1c1b1b] px-1 uppercase tracking-wider">Item Name *</label>
              <input v-model="form.name" type="text" placeholder="e.g. Blue Hydroflask, MacBook Air" 
                class="w-full bg-[#f3f5f2] border-2 border-transparent rounded-xl px-5 py-4 focus:border-[#387b41] focus:bg-white outline-none transition-all text-sm font-medium" required />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-xs font-bold text-[#1c1b1b] px-1 uppercase tracking-wider">Location *</label>
                <input v-model="form.location" type="text" placeholder="e.g. Lab 3, Library" 
                  class="w-full bg-[#f3f5f2] border-2 border-transparent rounded-xl px-5 py-4 focus:border-[#387b41] focus:bg-white outline-none transition-all text-sm font-medium" required />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-bold text-[#1c1b1b] px-1 uppercase tracking-wider">Category</label>
                <div class="relative">
                  <select v-model="form.category" class="w-full bg-[#f3f5f2] border-2 border-transparent rounded-xl px-5 py-4 focus:border-[#387b41] focus:bg-white outline-none transition-all text-sm font-medium appearance-none">
                    <option>Electronics</option>
                    <option>Daily Use</option>
                    <option>Clothing</option>
                    <option>Books/Stationery</option>
                    <option>Others</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#40493d]">expand_more</span>
                </div>
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-xs font-bold text-[#1c1b1b] px-1 uppercase tracking-wider">Description</label>
              <textarea v-model="form.description" rows="3" placeholder="Color, brand, or other identifying features..." 
                class="w-full bg-[#f3f5f2] border-2 border-transparent rounded-xl px-5 py-4 focus:border-[#387b41] focus:bg-white outline-none transition-all text-sm font-medium resize-none"></textarea>
            </div>
          </div>

          <button type="submit" :disabled="isSubmitting"
            :class="['w-full py-5 rounded-[1.25rem] font-bold text-base transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white', 
            form.type === 'Found' ? 'bg-[#387b41] hover:bg-[#2d6334]' : 'bg-[#ba1a1a] hover:bg-[#961515]']">
            {{ isSubmitting ? 'Submitting...' : 'Submit Report' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
