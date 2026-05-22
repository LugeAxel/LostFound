<template>
  <footer class="w-full mt-auto">
    <div v-if="ratings.length > 0" class="border-t border-[#e0e4df] dark:border-[#374151] py-8 overflow-hidden">
      <h3 style="font-family: 'Space Grotesk', sans-serif;" class="text-center text-sm font-regular text-[#387b41] dark:text-[#88d982] mb-6 tracking-wide">
        {{ t('footer.review_heading') }}
      </h3>
      <div class="review-marquee">
        <div class="review-track animate-marquee">
          <div v-for="(r, idx) in [...ratings, ...ratings]" :key="idx" class="review-card">
            <div class="review-avatar">{{ (r.user?.nama || 'A').charAt(0) }}</div>
            <div class="review-body">
              <div class="review-stars">
                <span v-for="s in 5" :key="s"
                  class="material-symbols-outlined text-sm"
                  :class="s <= r.rating ? 'text-[#f59e0b]' : 'text-[#e0e4df] dark:text-[#374151]'"
                  :style="s <= r.rating ? 'font-variation-settings: \'FILL\' 1;' : ''">star</span>
              </div>
              <p class="review-comment" v-if="r.comment">"{{ r.comment }}"</p>
              <p class="review-comment text-[#40493d] dark:text-[#6b7280] italic" v-else>—</p>
              <span class="review-author">— {{ r.user?.nama || 'Anonymous' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="py-8 text-center text-[#40493d] dark:text-[#9ca3af] text-sm border-t border-[#e0e4df] dark:border-[#374151]">
      <div class="flex justify-center gap-4 md:gap-6 mb-4">
        <RouterLink to="/developer" class="hover:text-[#387b41] font-bold transition-colors">Developer</RouterLink>
        <a href="#" class="hover:text-[#387b41] font-bold transition-colors">Contact</a>
        <a href="#" class="hover:text-[#387b41] font-bold transition-colors">Other</a>
      </div>
      <p>&copy; 2026 QReturn SMKN 2 Depok. All rights reserved.</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import axios from 'axios';
import { API_URL } from '@/config/api';
import { getAuthHeaders } from '../composables/useAuth';
import { useI18n } from '../i18n';

const { t } = useI18n();
const ratings = ref<any[]>([]);

const fetchRatings = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/ratings`, { headers: await getAuthHeaders() });
    ratings.value = res.data.ratings || [];
  } catch {
    ratings.value = [];
  }
};

onMounted(fetchRatings);
</script>

<style scoped>
.review-marquee {
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
}

.review-track {
  display: inline-flex;
  gap: 20px;
  animation: marquee 60s linear infinite;
  padding: 4px 0;
}

.review-track:hover {
  animation-play-state: paused;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.review-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 280px;
  max-width: 320px;
  background: white;
  border: 1px solid #e0e4df;
  border-radius: 16px;
  padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;
}

.dark .review-card {
  background: #1e1e1e;
  border-color: #374151;
}

.review-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.review-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: #387b41;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.review-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.review-stars {
  display: flex;
  gap: 1px;
  line-height: 1;
}

.review-comment {
  font-size: 13px;
  color: #1c1b1b;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 210px;
}

.dark .review-comment {
  color: #e5e7eb;
}

.review-author {
  font-size: 11px;
  font-weight: 600;
  color: #40493d;
}

.dark .review-author {
  color: #9ca3af;
}
</style>
