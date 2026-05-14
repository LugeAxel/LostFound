<script setup lang="ts">
import { ref, onMounted } from 'vue';
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

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
      form.value.claimPhoto = imagePreview.value;
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
            <div @click="fileInput?.click()" class="relative group cursor-pointer">
              <div v-if="!imagePreview" class="w-full h-48 border-2 border-dashed border-[#e0e4df] dark:border-[#374151] rounded-3xl bg-[#f8faf7] dark:bg-[#121212] flex flex-col items-center justify-center gap-2 group-hover:bg-[#f3f5f2] dark:bg-[#2a2a2a] group-hover:border-[#387b41]/30 transition-all">
                <span class="material-symbols-outlined text-4xl text-[#40493d] dark:text-[#9ca3af]/40">photo_camera</span>
                <p class="text-xs font-bold text-[#40493d] dark:text-[#9ca3af]">Take Photo with the Item</p>
                <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af]/50">Required for verification</p>
              </div>
              <div v-else class="w-full h-64 rounded-3xl overflow-hidden shadow-md border border-[#e0e4df] dark:border-[#374151]">
                <img :src="imagePreview" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p class="text-white font-bold text-sm">Retake Photo</p>
                </div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" capture="user" class="hidden" @change="handleFileUpload" />
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
