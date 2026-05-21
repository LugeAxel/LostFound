<template>
  <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl overflow-hidden border border-[#e0e4df] dark:border-[#374151] shadow-sm animate-pulse">
    <!-- Image Skeleton -->
    <div class="relative aspect-[4/3] w-full bg-[#f3f5f2] dark:bg-[#2a2a2a] flex items-center justify-center">
      <span class="material-symbols-outlined text-4xl text-[#c4c7c3] dark:text-[#3d423b]">image</span>
    </div>
    
    <!-- Content Skeleton -->
    <div class="p-3 sm:p-4 md:p-5 space-y-3">
      <!-- Title -->
      <div class="h-4 bg-[#e0e4df] dark:bg-[#374151] rounded w-3/4"></div>
      
      <!-- Location and GPS info -->
      <div class="space-y-2">
        <div class="h-3 bg-[#e0e4df] dark:bg-[#374151] rounded w-5/6"></div>
        <div class="h-3 bg-[#e0e4df] dark:bg-[#374151] rounded w-1/2"></div>
      </div>
      
      <!-- Footer details -->
      <div class="flex items-center justify-between pt-2">
        <div class="h-5 bg-[#e0e4df] dark:bg-[#374151] rounded-full w-16"></div>
        <div class="h-3 bg-[#e0e4df] dark:bg-[#374151] rounded w-12"></div>
      </div>
    </div>
  </div>
</template>
