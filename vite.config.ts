import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'QReturn — Lost & Found SMKN 2 Depok',
        short_name: 'QReturn',
        description: 'Sistem Lost & Found cerdas untuk SMKN 2 Depok',
        theme_color: '#387b41',
        background_color: '#fcf9f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/dashboard',
        scope: '/',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      selfDestroying: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: true
  }
})
