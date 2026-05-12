<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = JSON.parse(localStorage.getItem('user') || '{}');

const form = ref({
  name: '',
  location: '',
  category: 'General',
  type: 'Found',
  description: '',
  imageUrl: ''
});

const isSubmitting = ref(false);

const submitReport = async () => {
  if (!form.value.name || !form.value.location) {
    alert('Please fill in required fields');
    return;
  }

  isSubmitting.value = true;
  try {
    const apiUrl = (import.meta as any).env.VITE_API_URL;
    await axios.post(`${apiUrl}/api/items`, {
      ...form.value,
      reporter: user._id
    });
    alert('Report submitted successfully!');
    router.push('/dashboard');
  } catch (error) {
    console.error('Error submitting report:', error);
    alert('Failed to submit report');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-surface p-6 md:p-12">
    <div class="max-w-2xl mx-auto">
      <button @click="router.back()" class="flex items-center gap-2 text-on-surface-variant hover:text-primary mb-8 transition-colors">
        <span class="material-symbols-outlined">arrow_back</span>
        Back to Dashboard
      </button>

      <div class="bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-outline-variant">
        <h2 class="text-3xl font-bold text-on-surface mb-2">Lapor Barang</h2>
        <p class="text-on-surface-variant mb-8">Masukkan detail barang yang hilang atau ditemukan.</p>

        <form @submit.prevent="submitReport" class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <button type="button" 
              @click="form.type = 'Found'"
              :class="['py-4 rounded-2xl font-bold flex flex-col items-center gap-2 border-2 transition-all', 
              form.type === 'Found' ? 'bg-primary-container/10 border-primary text-primary' : 'bg-surface border-transparent text-on-surface-variant']">
              <span class="material-symbols-outlined text-3xl">add_a_photo</span>
              Ditemukan
            </button>
            <button type="button" 
              @click="form.type = 'Lost'"
              :class="['py-4 rounded-2xl font-bold flex flex-col items-center gap-2 border-2 transition-all', 
              form.type === 'Lost' ? 'bg-error-container/10 border-error text-error' : 'bg-surface border-transparent text-on-surface-variant']">
              <span class="material-symbols-outlined text-3xl">search</span>
              Kehilangan
            </button>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-bold text-on-surface px-1">Nama Barang *</label>
            <input v-model="form.name" type="text" placeholder="Contoh: Kunci Motor, Botol Minum" 
              class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all" required />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-bold text-on-surface px-1">Lokasi *</label>
              <input v-model="form.location" type="text" placeholder="Contoh: Kantin, Lab 3" 
                class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all" required />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-bold text-on-surface px-1">Kategori</label>
              <select v-model="form.category" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all">
                <option>Electronics</option>
                <option>Daily Use</option>
                <option>Clothing</option>
                <option>Books/Stationery</option>
                <option>Others</option>
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-bold text-on-surface px-1">URL Gambar (Opsional)</label>
            <input v-model="form.imageUrl" type="text" placeholder="https://..." 
              class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all" />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-bold text-on-surface px-1">Deskripsi Tambahan</label>
            <textarea v-model="form.description" rows="3" placeholder="Warna, merk, atau ciri khas lainnya..." 
              class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all"></textarea>
          </div>

          <button type="submit" :disabled="isSubmitting"
            class="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
            {{ isSubmitting ? 'Mengirim...' : 'Kirim Laporan' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
