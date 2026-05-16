<script setup lang="ts">
import { useI18n } from '../i18n';

const { t } = useI18n();

const props = defineProps<{
  item: {
    id: string;
    name: string;
    location: string;
    category: string;
    status: string;
    type: string;
    reported_at: string;
    image_url?: string;
    coordinates_lat?: number;
    coordinates_lng?: number;
    reporter?: {
      nama: string;
      nisn: string;
    };
    claimer?: {
      nama: string;
    };
  };
}>();

const hasGps = () => {
  return props.item.coordinates_lat != null && props.item.coordinates_lng != null;
};

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
  <RouterLink :to="`/item/${item.id}`" :class="['bg-white dark:bg-[#1e1e1e] rounded-2xl overflow-hidden border transition-all group relative block', 
    item.status === 'Returned' ? 'border-[#abf4ac] opacity-80' : 'border-[#e0e4df] dark:border-[#374151] shadow-sm hover:shadow-md']">
    
    <div v-if="item.status === 'Returned'" class="absolute top-0 right-0 z-10 overflow-hidden w-24 h-24">
      <span class="absolute top-3 right-[-30px] w-28 py-1 bg-[#387b41] text-white text-[8px] font-bold uppercase tracking-widest text-center rotate-45 shadow-sm">{{ t('card.returned') }}</span>
    </div>

    <div class="relative aspect-[4/3] sm:aspect-[4/3] w-full overflow-hidden bg-[#f3f5f2] dark:bg-[#2a2a2a]">
      <img v-if="item.image_url" :src="item.image_url" 
        :class="['w-full h-full object-cover group-hover:scale-105 transition-transform duration-500',
          item.status === 'Returned' ? 'grayscale' : '']" 
        alt="Item image"
        loading="lazy" />
      <div v-else :class="['w-full h-full flex flex-col items-center justify-center opacity-30 gap-2',
        item.status === 'Returned' ? 'grayscale' : '']">
        <span class="material-symbols-outlined text-5xl">{{ item.type === 'lost' ? 'search' : 'inventory_2' }}</span>
        <p class="text-[10px] font-bold uppercase tracking-widest">{{ item.type === 'lost' ? t('card.lost_item') : t('card.found_item') }}</p>
      </div>

      <div class="absolute bottom-3 left-3 flex gap-2">
        <span :class="['text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded shadow-sm', 
          item.type === 'lost' ? 'bg-[#ba1a1a] text-white' : 'bg-[#1b6d24] text-white']">
          {{ item.type === 'lost' ? t('card.lost') : t('card.found') }}
        </span>
        <span class="bg-white/90 backdrop-blur-sm text-[#1c1b1b] text-[10px] font-bold px-2 py-1 rounded shadow-sm truncate max-w-[70px]">
          {{ translateCategory(item.category) }}
        </span>
      </div>
    </div>
    <div class="p-3 sm:p-4 md:p-5">
      <h4 class="font-bold mb-1 truncate text-sm sm:text-base text-[#1c1b1b] dark:text-[#f3f4f6]">{{ item.name }}</h4>
      <div class="flex flex-col gap-0.5 sm:gap-1 mb-2 sm:mb-4">
        <p class="text-[11px] sm:text-xs text-[#40493d] dark:text-[#9ca3af] flex items-center gap-1 pl-1 truncate">
          <span class="material-symbols-outlined text-sm sm:text-base shrink-0">location_on</span>
          {{ item.type === 'lost' ? t('detail.last_seen') + ' ' + item.location : t('detail.found_at') + ' ' + item.location }}
        </p>
        <p class="text-[8px] sm:text-[9px] font-bold flex items-center gap-1 ml-1"
          :class="hasGps() ? 'text-[#387b41]' : 'text-[#ba1a1a]'">
          <span class="material-symbols-outlined text-[10px] sm:text-xs">{{ hasGps() ? 'gps_fixed' : 'gps_off' }}</span>
          {{ hasGps() ? t('card.gps_verified') : t('card.no_gps') }}
        </p>
      </div>
      <div class="flex items-center justify-between">
        <span :class="['text-[10px] px-3 py-1 rounded-full font-bold', 
          item.status === 'Available' ? 'bg-[#abf4ac] text-[#07521d]' : 'bg-[#dee5d6] text-[#42493e]']">
          {{ translateStatus(item.status) }}
        </span>
        <span v-if="item.status === 'Returned' && item.claimer" class="text-[9px] text-[#387b41] font-bold ml-3 truncate max-w-full" :title="item.claimer.nama">
          {{ t('card.claimed_by') }} {{ item.claimer.nama }}
        </span>
        <span v-else class="text-[10px] text-[#40493d] dark:text-[#9ca3af] font-medium">{{ formatDate(item.reported_at) }}</span>
      </div>
    </div>
  </RouterLink>
</template>
