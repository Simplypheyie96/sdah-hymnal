import { useRegisterSW } from 'virtual:pwa-register/react'

// How often an open app re-checks for a new version. A check is one
// conditional request for sw.js, which the server answers 304 when nothing
// has changed.
const UPDATE_EVERY_MS = 60 * 60 * 1000

/**
 * Registers the service worker and reports when a new version is waiting.
 *
 * The worker runs in 'prompt' mode, so an update installs but waits rather
 * than reloading the page from under the reader. `needRefresh` turns true when
 * one is ready; `refresh()` activates it and reloads the page.
 *
 * The worker only ever checks for updates at registration — a full page load.
 * An installed app resumed from the app switcher never reloads, so someone who
 * never fully quits it could sit on a months-old version indefinitely. So we
 * check again whenever the app returns to the foreground, and hourly while it
 * stays open.
 */
export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
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

  return { needRefresh, refresh: () => void updateServiceWorker(true) }
}
