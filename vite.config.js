import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Parlare – Habla idiomas de verdad',
        short_name: 'Parlare',
        description: 'Practica idiomas con IA en tiempo real',
        theme_color: '#FF6B00',
        background_color: '#0F0F1A',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache shell (JS, CSS, HTML)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Rutas de API siempre van a red
        navigateFallback: '/',
        runtimeCaching: [
          {
            // Assets estáticos → cache first
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'parlare-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // APIs externas (Groq, Deepgram) → network only, sin caché
            urlPattern: /^https:\/\/(api\.groq\.com|api\.deepgram\.com)/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
