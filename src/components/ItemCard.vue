<script setup lang="ts">
import { useI18n } from '../i18n';

const { t } = useI18n();

const props = defineProps<{
  item: {
    _id: string;
    name: string;
    location: string;
    category: string;
    status: string;
    type: string;
    reportedAt: string;
    imageUrl?: string;
    coordinates?: { latitude: number; longitude: number };
    reporter?: {
      nama: string;
      nisn: string;
    };
    claimer?: {
      nama: string;
    };
  };
}>();

const formatDate = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return t('card.just_now');
  if (hours < 24) return `${hours} ${t('card.hours_ago')}`;
  return `${Math.floor(hours / 24)} ${t('card.days_ago')}`;
};

const translateCategory = (category: string) => {
  const key = `card.category.${category}`;
  const translated = t(key);
  return translated !== key ? translated : category;
};

const translateStatus = (status: string) => {
  const key = `card.status.${status}`;
  const translated = t(key);
  return translated !== key ? translated : status;
};
</script>

<template>
  <RouterLink :to="`/item/${item._id}`" :class="['bg-white rounded-2xl overflow-hidden border transition-all group relative block', 
    item.status === 'Returned' ? 'border-[#abf4ac] opacity-80' : 'border-[#e0e4df] shadow-sm hover:shadow-md']">
    
    <div v-if="item.status === 'Returned'" class="absolute top-2 right-2 z-10">
      <span class="bg-[#387b41] text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm">{{ t('card.returned') }}</span>
    </div>

    <div class="relative h-48 w-full overflow-hidden bg-[#f3f5f2]">
      <img v-if="item.imageUrl" :src="item.imageUrl" 
        :class="['w-full h-full object-cover group-hover:scale-105 transition-transform duration-500',
          item.status === 'Returned' ? 'grayscale' : '']" 
        alt="Item image"
        loading="lazy" />
      <div v-else :class="['w-full h-full flex flex-col items-center justify-center opacity-30 gap-2',
        item.status === 'Returned' ? 'grayscale' : '']">
        <span class="material-symbols-outlined text-5xl">{{ item.type === 'lost' ? 'search' : 'inventory_2' }}</span>
        <p class="text-[10px] font-bold uppercase tracking-widest">{{ item.type === 'lost' ? t('card.lost_item') : t('card.found_item') }}</p>
      </div>

      <div class="absolute top-3 left-3 flex gap-2">
        <span :class="['text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded shadow-sm', 
          item.type === 'lost' ? 'bg-[#ba1a1a] text-white' : 'bg-[#1b6d24] text-white']">
          {{ item.type === 'lost' ? t('card.lost') : t('card.found') }}
        </span>
        <span class="bg-white/90 backdrop-blur-sm text-[#1c1b1b] text-[10px] font-bold px-2 py-1 rounded shadow-sm">
          {{ translateCategory(item.category) }}
        </span>
      </div>
    </div>
    <div class="p-5">
      <h4 class="font-bold mb-1 truncate text-[#1c1b1b]">{{ item.name }}</h4>
      <div class="flex flex-col gap-1 mb-4">
        <p class="text-xs text-[#40493d] flex items-center gap-1">
          <span class="material-symbols-outlined text-base">location_on</span>
          {{ item.location }}
        </p>
        <p v-if="item.coordinates" class="text-[9px] text-[#387b41] font-bold flex items-center gap-1 ml-1">
          <span class="material-symbols-outlined text-xs">gps_fixed</span> {{ t('card.gps_verified') }}
        </p>
      </div>
      <div class="flex items-center justify-between">
        <span :class="['text-[10px] px-3 py-1 rounded-full font-bold', 
          item.status === 'Available' ? 'bg-[#abf4ac] text-[#07521d]' : 'bg-[#dee5d6] text-[#42493e]']">
          {{ translateStatus(item.status) }}
        </span>
        <span v-if="item.status === 'Returned' && item.claimer" class="text-[9px] text-[#387b41] font-bold ml-3">
          {{ t('card.claimed_by') }} {{ item.claimer.nama }}
        </span>
        <span v-else class="text-[10px] text-[#40493d] font-medium">{{ formatDate(item.reportedAt) }}</span>
      </div>
    </div>
  </RouterLink>
</template>
