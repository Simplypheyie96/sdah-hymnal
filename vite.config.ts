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
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SDA Hymnal — Hymns & Readings',
        short_name: 'Hymnal',
        description:
          'The Seventh-day Adventist Hymnal: hymns and scripture readings 1–920, with music playback and projection for church and home worship.',
        // A stable identity for the installed app, independent of the launch
        // URL — so a cast link (?present=…) can never be mistaken for a second,
        // separate app when Android decides what is already installed.
        id: '/',
        // The launch URL carries a marker so an installed app can be told
        // apart from a browser visit. Custom analytics events are a paid
        // feature, but page paths are not, so the query string is what makes
        // "opened from the home screen" countable at all. `id` stays '/', so
        // this does not make the installed app look like a different one.
        start_url: '/?source=installed',
        scope: '/',
        lang: 'en',
        categories: ['books', 'education', 'lifestyle'],
        theme_color: '#f2f3f3',
        background_color: '#f2f3f3',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Its own file: Android crops maskable icons to a circle, so the
          // mark is inset rather than full-bleed. Reusing the 'any' icon here
          // shaved the edges off the book.
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + the English edition precache. Recordings are ~1 GB in
        // total and must never be precached — they cache individually as
        // hymns are actually played, below.
        // Both editions precache: the words are the part that must never
        // depend on a signal. Together they are ~2 MB.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}', 'data/*.json'],
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
          // Recordings are deliberately NOT routed here. A <audio> element
          // streams with Range requests, and an installed PWA — iOS
          // especially — breaks when a service worker answers those. The app
          // manages the 'hymn-audio' cache itself in src/lib/audio.ts, which
          // keeps media requests off the worker entirely.
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
