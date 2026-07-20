import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { HymnalProvider } from './data/hymnal.tsx'

// Visitor counts. Cookieless and anonymous: page path, referrer, country,
// device class. No identifiers, nothing that follows anyone between sites,
// and nothing that needs a consent banner.
//
// Anything sent while offline is simply lost, so these numbers under-report
// by design. That is the price of an app built to work in a hall with no
// connection, and the figures should be read as a floor rather than a count.
inject()

// Keep an installed app up to date.
//
// The worker is registered with autoUpdate, so a new version installs and
// reloads the page by itself — but only ever checks at registration, which
// happens on a full page load. An installed app resumed from the app switcher
// does not reload, so someone who never fully quits it can sit on a months-old
// version indefinitely. That is exactly what happened after the first release.
//
// So: check again whenever the app is brought back to the front, and hourly
// while it stays open. A check is one conditional request for sw.js, which the
// server answers 304 when nothing has changed.
const UPDATE_EVERY_MS = 60 * 60 * 1000

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return

    const check = () => {
      // Pointless offline, and it would only log a failed fetch.
      if (navigator.onLine) void registration.update().catch(() => {})
    }

    window.setInterval(check, UPDATE_EVERY_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HymnalProvider>
      <App />
    </HymnalProvider>
  </StrictMode>,
)
