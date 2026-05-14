<template>
  <div class="min-h-screen bg-[#f8faf7] dark:bg-[#121212] flex font-sans">
    <SideNav />
    <TopNav />
    <main class="md:ml-64 pt-24 px-8 pb-12 w-full max-w-[1200px] mx-auto flex flex-col min-h-screen">
      <div class="flex-grow">
        <button @click="router.back()" class="flex items-center gap-2 text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] mb-8 transition-colors font-bold text-sm group">
          <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Back
        </button>

        <div class="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] shadow-xl p-4 md:p-8 md:p-12 border border-[#e0e4df] dark:border-[#374151] relative overflow-hidden mb-12">
          <div class="absolute -top-20 -right-20 w-40 h-40 bg-[#387b41] opacity-5 rounded-full"></div>
          
          <h1 class="text-4xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-4 tracking-tight">Our Developers</h1>
          <p class="text-[#40493d] dark:text-[#9ca3af] mb-12 text-base md:text-lg font-medium max-w-2xl">Meet the dedicated team that built the LostFound platform for SMKN 2 Depok. We are passionate about making the school environment better.</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 relative z-10">
            <div v-for="dev in developers" :key="dev.name" class="bg-[#f8faf7] dark:bg-[#121212] rounded-[2rem] p-4 md:p-6 shadow-sm border border-[#e0e4df] dark:border-[#374151] text-center hover:shadow-md transition-all group">
              <div class="w-32 h-32 mx-auto rounded-full bg-gray-200 mb-6 overflow-hidden border-4 border-white shadow-sm group-hover:scale-105 transition-transform duration-300">
                <img :src="dev.photo" alt="Developer photo" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
              </div>
              <h3 class="font-bold text-base md:text-lg md:text-xl text-[#1c1b1b] dark:text-[#f3f4f6] mb-1">{{ dev.name }}</h3>
              <p class="text-[#387b41] text-sm font-bold uppercase tracking-wider mb-4">{{ dev.role }}</p>
              <p class="text-xs text-[#40493d] dark:text-[#9ca3af]">{{ dev.description }}</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import SideNav from '../components/SideNav.vue';
import TopNav from '../components/TopNav.vue';
import Footer from '../components/Footer.vue';

const router = useRouter();

const developers = [
  { name: 'Developer 1', role: 'Frontend Engineer', description: 'Specializes in Vue.js and Tailwind CSS interfaces.', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
  { name: 'Developer 2', role: 'Backend Engineer', description: 'Architects the Express.js and MongoDB database.', photo: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80' },
  { name: 'Developer 3', role: 'UI/UX Designer', description: 'Creates the user flow and modern aesthetics.', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  { name: 'Developer 4', role: 'QA & Testing', description: 'Ensures everything works perfectly on all devices.', photo: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=80' },
];
</script>
