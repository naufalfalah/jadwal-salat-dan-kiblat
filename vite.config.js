import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest: pakai src/sw.js sebagai SW kustom (untuk push handler)
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Jadwal Salat & Kiblat',
        short_name: 'Salat',
        description: 'Jadwal sholat 5 waktu dan kompas kiblat, bekerja offline',
        theme_color: '#059669',
        background_color: '#059669',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      injectManifest: {
        // Cache semua aset statik app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime cache: Google Fonts (jika ditambahkan nanti)
        // Dikonfigurasi di src/sw.js jika dibutuhkan
      },
    }),
  ],
})
