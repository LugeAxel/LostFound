<script setup lang="ts">

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
    reporter?: {
      nama: string;
      nisn: string;
    };
  };
}>();

const formatDate = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
};
</script>

<template>
  <div class="bg-white rounded-2xl overflow-hidden border border-[#e0e4df] shadow-sm hover:shadow-md transition-all group">
    <div class="relative h-48 w-full overflow-hidden">
      <img :src="item.imageUrl || 'https://placehold.co/400x300/f3f5f2/40493d?text=No+Image'" 
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        alt="Item image"
        loading="lazy" />
      <div class="absolute top-3 left-3 flex gap-2">
        <span :class="['text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded shadow-sm', 
          item.type === 'lost' ? 'bg-[#ba1a1a] text-white' : 'bg-[#1b6d24] text-white']">
          {{ item.type === 'lost' ? 'LOST' : 'FOUND' }}
        </span>
        <span class="bg-white/90 backdrop-blur-sm text-[#1c1b1b] text-[10px] font-bold px-2 py-1 rounded shadow-sm">
          {{ item.category }}
        </span>
      </div>
    </div>
    <div class="p-5">
      <h4 class="font-bold mb-1 truncate text-[#1c1b1b]">{{ item.name }}</h4>
      <p class="text-xs text-[#40493d] flex items-center gap-1 mb-4">
        <span class="material-symbols-outlined text-base">location_on</span>
        {{ item.location }}
      </p>
      <div class="flex items-center justify-between">
        <span :class="['text-[10px] px-3 py-1 rounded-full font-bold', 
          item.status === 'Available' ? 'bg-[#abf4ac] text-[#07521d]' : 'bg-[#dee5d6] text-[#42493e]']">
          {{ item.status }}
        </span>
        <span class="text-[10px] text-[#40493d] font-medium">{{ formatDate(item.reportedAt) }}</span>
      </div>
    </div>
  </div>
</template>
