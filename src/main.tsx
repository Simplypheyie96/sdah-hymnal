import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { HymnalProvider } from './data/hymnal.tsx'

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
