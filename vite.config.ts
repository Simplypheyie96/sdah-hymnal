import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Honour the port handed to us by the environment (the preview harness
  // assigns one via PORT). Falls back to Vite's usual 5173 for a plain
  // `npm run dev`.
  server: { port: Number(process.env.PORT) || 5173 },
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
        // A real path, not a query string, so that opening the app from the
        // home screen is countable. Analytics groups visits by pathname; query
        // strings only surface in the UTM panel, which is a paid feature, so a
        // marker in the query string would have been invisible.
        //
        // vercel.json rewrites this to index.html, and the service worker
        // falls back to the same document offline. `id` stays '/', so the
        // installed app is still recognised as this app rather than a second
        // one.
        start_url: '/installed',
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
