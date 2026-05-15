<template>
  <footer class="mt-auto py-8 text-center text-[#40493d] dark:text-[#9ca3af] text-sm border-t border-[#e0e4df] dark:border-[#374151] w-full">
    <div class="flex justify-center gap-4 md:gap-6 mb-4">
      <RouterLink to="/developer" class="hover:text-[#387b41] font-bold transition-colors">Developer</RouterLink>
      <a href="#" class="hover:text-[#387b41] font-bold transition-colors">Contact</a>
      <a href="#" class="hover:text-[#387b41] font-bold transition-colors">Other</a>
    </div>
    <p>&copy; 2026 QReturn SMKN 2 Depok. All rights reserved.</p>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
