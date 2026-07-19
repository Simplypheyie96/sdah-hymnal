import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SDA Hymnal — Hymns & Readings',
        short_name: 'Hymnal',
        description:
          'The Seventh-day Adventist Hymnal: hymns and scripture readings 1–920, with music playback and projection for church and home worship.',
        theme_color: '#f2f3f3',
        background_color: '#f2f3f3',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + the English edition precache. Recordings are ~1 GB in
        // total and must never be precached — they cache individually as
        // hymns are actually played, below.
        // Both editions precache: the words are the part that must never
        // depend on a signal. Together they are ~2 MB.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'data/*.json'],
        globIgnores: ['**/audio/**'],
        // A single recording can exceed the default 2 MB precache ceiling.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Network-first: a corrected hymn should never be shown stale
            // while online. Falls back to cache immediately when offline.
            urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hymnal-editions',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 8 },
            },
          },
          {
            // Recordings keep themselves once played, so a hymn sung last
            // Sabbath still works with no signal. Capped so the cache cannot
            // grow without bound on a phone.
            urlPattern: ({ url }) => url.pathname.startsWith('/audio/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'hymn-audio',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true, // media elements request byte ranges
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
