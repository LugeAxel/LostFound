<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps<{
  modelValue: { latitude: number; longitude: number } | null
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: { latitude: number; longitude: number } | null): void
}>();

const mapContainer = ref<HTMLElement | null>(null);
const mapInstance = ref<L.Map | null>(null);
const markerInstance = ref<L.Marker | null>(null);

const initMap = async () => {
  if (!mapContainer.value || !props.modelValue) return;

  const { latitude, longitude } = props.modelValue;
  
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }

  const map = L.map(mapContainer.value).setView([latitude, longitude], 16);
  mapInstance.value = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const customIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#1aff00" d="M12 2c-4.41 0-8 3.59-8 8c-.03 6.44 7.12 11.6 7.42 11.82c.17.12.38.19.58.19s.41-.06.58-.19c.3-.22 7.45-5.37 7.42-11.82c0-4.41-3.59-8-8-8m0 12c-2.21 0-4-1.79-4-4s1.79-4 4-4s4 1.79 4 4s-1.79 4-4 4" stroke-width="0.5" stroke="#000"/></svg>`,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const marker = L.marker([latitude, longitude], { 
    draggable: true,
    icon: customIcon 
  }).addTo(map);
  markerInstance.value = marker;

  marker.on('dragend', () => {
    const latLng = marker.getLatLng();
    emit('update:modelValue', { latitude: latLng.lat, longitude: latLng.lng });
  });

  // Ensure map tiles are sized correctly
  await nextTick();
  map.invalidateSize();
};

watch(() => props.modelValue, (newVal) => {
  if (newVal && mapInstance.value) {
    const { latitude, longitude } = newVal;
    const currentCenter = mapInstance.value.getCenter();
    if (currentCenter.lat !== latitude || currentCenter.lng !== longitude) {
      mapInstance.value.setView([latitude, longitude], 16);
      if (markerInstance.value) {
        markerInstance.value.setLatLng([latitude, longitude]);
      }
    }
  }
}, { deep: true });

onMounted(async () => {
  await nextTick();
  initMap();
});

onBeforeUnmount(() => {
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }
});
</script>

<template>
  <div class="relative w-full h-[300px] rounded-2xl overflow-hidden border border-[#e0e4df] mt-2">
    <div ref="mapContainer" class="w-full h-full"></div>
    <div class="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#e0e4df] shadow-sm flex items-center gap-2">
      <span class="material-symbols-outlined text-[#387b41] text-sm">info</span>
      <span class="text-[10px] font-bold text-[#40493d] uppercase tracking-wider">Drag marker to refine location</span>
    </div>
  </div>
</template>

<style scoped>
:deep(.leaflet-container) {
  width: 100%;
  height: 100%;
  z-index: 1;
}

:deep(.custom-marker-icon) {
  background: none !important;
  border: none !important;
}
</style>
