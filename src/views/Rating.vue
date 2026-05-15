<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import { useI18n } from '../i18n';
import { API_URL } from '@/config/api';
import { useToast } from '../composables/useToast';

const router = useRouter();
const { t } = useI18n();
const toast = useToast();

const averageRating = ref(0);
const totalRatings = ref(0);
const ratings = ref<any[]>([]);
const myRating = ref<any>(null);
const isLoading = ref(true);
const isSubmitting = ref(false);

const selectedStars = ref(0);
const comment = ref('');
const hoveredStar = ref(0);

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchRatings = async () => {
  try {
    const [allRes, mineRes] = await Promise.all([
      axios.get(`${API_URL}/api/ratings`, { headers: getAuthHeaders() }),
      axios.get(`${API_URL}/api/ratings/mine`, { headers: getAuthHeaders() })
    ]);
    averageRating.value = allRes.data.averageRating;
    totalRatings.value = allRes.data.totalRatings;
    ratings.value = allRes.data.ratings;
    if (mineRes.data.rating) {
      myRating.value = mineRes.data.rating;
      selectedStars.value = mineRes.data.rating.rating;
      comment.value = mineRes.data.rating.comment || '';
    }
  } catch (error) {
    console.error('Error fetching ratings:', error);
  } finally {
    isLoading.value = false;
  }
};

const submitRating = async () => {
  if (selectedStars.value === 0) return;
  isSubmitting.value = true;
  try {
    const res = await axios.post(`${API_URL}/api/ratings`, {
      rating: selectedStars.value,
      comment: comment.value
    }, { headers: getAuthHeaders() });
    myRating.value = res.data.rating;
    toast.show(t('rating.thank_you'), 'success');
    await fetchRatings();
  } catch (error: any) {
    toast.show(error.response?.data?.message || 'Failed to submit rating', 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const starText = (count: number) => {
  return count === 1 ? t('rating.star') : t('rating.stars');
};

onMounted(fetchRatings);
</script>

<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex font-sans pb-20">
    <SideNav />
    <TopNav />

    <main class="md:ml-64 pt-24 px-4 sm:px-6 md:px-8 pb-12 w-full max-w-[1200px] mx-auto">
      <button @click="router.push('/dashboard')"
        class="flex items-center gap-2 text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] mb-6 sm:mb-8 transition-colors font-bold text-sm group">
        <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        {{ t('detail.back') }}
      </button>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <!-- Average Rating Card -->
        <div class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] p-6 sm:p-8 md:p-10 border border-[#e0e4df] dark:border-[#374151] shadow-sm text-center">
          <div class="w-16 h-16 bg-[#f0fdf4] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span class="material-symbols-outlined text-3xl text-[#387b41]">star</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-2">{{ t('rating.average') }}</h2>

          <div v-if="!isLoading" class="mt-6">
            <div class="text-5xl sm:text-6xl font-bold text-[#387b41]">{{ averageRating }}</div>
            <div class="flex items-center justify-center gap-1 mt-3">
              <span v-for="i in 5" :key="i"
                class="material-symbols-outlined text-2xl sm:text-3xl"
                :class="i <= Math.round(averageRating) ? 'text-[#f59e0b]' : 'text-[#e0e4df] dark:text-[#374151]'"
                :style="i <= Math.round(averageRating) ? 'font-variation-settings: \'FILL\' 1;' : ''">star</span>
            </div>
            <p class="text-sm text-[#40493d] dark:text-[#9ca3af] mt-3">
              {{ totalRatings }} {{ t('rating.total_ratings') }}
            </p>
          </div>
          <div v-else class="flex justify-center py-10">
            <div class="w-8 h-8 border-4 border-[#387b41]/20 border-t-[#387b41] rounded-full animate-spin"></div>
          </div>
        </div>

        <!-- Your Rating Card -->
        <div class="bg-white dark:bg-[#1e1e1e] rounded-[2rem] p-6 sm:p-8 md:p-10 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
          <div class="w-12 h-12 bg-[#fef2f2] rounded-2xl flex items-center justify-center mb-6">
            <span class="material-symbols-outlined text-2xl text-[#f59e0b]">rate_review</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-1">{{ t('rating.your_rating') }}</h2>
          <p v-if="myRating" class="text-xs text-[#387b41] font-bold mb-6">{{ t('rating.update') }}</p>
          <p v-else class="text-xs text-[#40493d] dark:text-[#9ca3af] mb-6">{{ t('rating.no_ratings_yet') }}</p>

          <div class="flex items-center gap-2 mb-6">
            <span v-for="i in 5" :key="i"
              @click="selectedStars = i"
              @mouseenter="hoveredStar = i"
              @mouseleave="hoveredStar = 0"
              class="material-symbols-outlined text-3xl sm:text-4xl cursor-pointer transition-all hover:scale-110"
              :class="i <= (hoveredStar || selectedStars) ? 'text-[#f59e0b]' : 'text-[#e0e4df] dark:text-[#374151]'"
              :style="i <= (hoveredStar || selectedStars) ? 'font-variation-settings: \'FILL\' 1;' : ''">star</span>
          </div>

          <div v-if="selectedStars > 0" class="space-y-4 animate-fade-in">
            <textarea v-model="comment" :placeholder="t('rating.comment_placeholder')" rows="3"
              class="w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] dark:text-white dark:placeholder-gray-500 border-2 border-transparent rounded-xl px-4 py-3 text-sm focus:border-[#387b41] focus:bg-white dark:focus:bg-[#1e1e1e] outline-none transition-all resize-none" />

            <button @click="submitRating" :disabled="isSubmitting"
              class="w-full py-3 bg-[#387b41] text-white rounded-xl font-bold text-sm hover:bg-[#2d6334] transition-all shadow-md active:scale-95 disabled:opacity-50">
              <span v-if="isSubmitting" class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                {{ t('detail.back') }}...
              </span>
              <span v-else>{{ myRating ? t('rating.update') : t('rating.submit') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Ratings -->
      <div class="mt-8 sm:mt-10 bg-white dark:bg-[#1e1e1e] rounded-[2rem] p-6 sm:p-8 border border-[#e0e4df] dark:border-[#374151] shadow-sm">
        <h3 class="text-lg font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-[#387b41]">history</span>
          {{ t('rating.recent_ratings') }}
        </h3>

        <div v-if="ratings.length === 0" class="text-center py-10 text-[#40493d] dark:text-[#9ca3af] text-sm">
          {{ t('rating.no_ratings_yet') }}
        </div>

        <div v-else class="space-y-4">
          <div v-for="(r, idx) in ratings" :key="idx"
            class="flex items-start gap-4 p-4 bg-[#f8faf7] dark:bg-[#121212] rounded-2xl border border-[#e0e4df] dark:border-[#374151]">
            <div class="w-9 h-9 rounded-full bg-[#387b41]/10 flex items-center justify-center text-[#387b41] font-bold text-sm shrink-0">
              {{ (r.user?.nama || 'A').charAt(0) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="text-xs font-bold text-[#1c1b1b] dark:text-[#f3f4f6]">{{ r.user?.nama || 'Anonymous' }}</span>
                <div class="flex gap-0.5">
                  <span v-for="s in 5" :key="s"
                    class="material-symbols-outlined text-sm"
                    :class="s <= r.rating ? 'text-[#f59e0b]' : 'text-[#e0e4df] dark:text-[#374151]'"
                    :style="s <= r.rating ? 'font-variation-settings: \'FILL\' 1;' : ''">star</span>
                </div>
              </div>
              <p v-if="r.comment" class="text-sm text-[#1c1b1b] dark:text-[#f3f4f6]">{{ r.comment }}</p>
              <p v-else class="text-sm text-[#40493d] dark:text-[#9ca3af] italic">{{ t('detail.no_description') }}</p>
              <p class="text-[10px] text-[#40493d] dark:text-[#9ca3af] mt-1">{{ new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
</style>
