import { useEffect, useState } from 'react'

// Turning a website into a home-screen app.
//
// Two worlds, and they could not be less alike. Chromium (Android Chrome, Edge,
// desktop Chrome) fires a `beforeinstallprompt` event when the site qualifies,
// and lets us trigger the real install dialog from a button of our own. Safari
// — the only iOS browser that can install anything — offers no event and no
// API at all: the reader has to go through Share → Add to Home Screen by hand,
// so the most we can do there is show them exactly where it hides.

/** The Chromium install event, which the DOM lib does not type. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform = 'ios' | 'chromium' | 'other'

// Held at module scope, deliberately. `beforeinstallprompt` fires once, early,
// and often before the component that wants it has mounted — miss it and there
// is no install button for the rest of the visit. Capturing it here, the
// moment this module loads, means it is waiting whenever a component asks.
let deferredPrompt: BeforeInstallPromptEvent | null = null
// The tab that triggers an install does not itself become standalone — it
// stays an ordinary browser tab — so display-mode alone would keep reporting
// "not installed" right after a successful install. `appinstalled` is the only
// signal that the current tab gets, so we remember it.
let installedThisTab = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Suppress Chrome's own mini-infobar; we offer the prompt from a button
    // instead, so it appears where the reader actually asked to install.
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installedThisTab = true
    notify()
  })
}

function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return (
    installedThisTab ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari predates display-mode and flags an installed app this way.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  // iPadOS 13+ masquerades as a Mac; a touch-capable "Mac" gives it away.
  // (navigator.platform would say the same, but it is deprecated.)
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  if (iOS) return 'ios'
  return deferredPrompt || /android/i.test(ua) ? 'chromium' : 'other'
}

export type InstallState = {
  /** Already running as an installed app — nothing more to offer. */
  installed: boolean
  /** A native install dialog is available right now (Chromium only). */
  canPrompt: boolean
  /** Which set of instructions this device needs. */
  platform: InstallPlatform
  /** Fire the native dialog; resolves once the reader has chosen. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

export function useInstall(): InstallState {
  const [canPrompt, setCanPrompt] = useState(() => !!deferredPrompt)
  const [installed, setInstalled] = useState(isInstalled)
  const [platform] = useState(detectPlatform)

  useEffect(() => {
    const update = () => {
      setCanPrompt(!!deferredPrompt)
      setInstalled(isInstalled())
    }
    listeners.add(update)
    // The display mode flips the instant an install completes, which lets an
    // open tab notice it became an app without a reload.
    const standalone = window.matchMedia?.('(display-mode: standalone)')
    standalone?.addEventListener?.('change', update)
    update()
    return () => {
      listeners.delete(update)
      standalone?.removeEventListener?.('change', update)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return 'unavailable' as const
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      return outcome
    } catch {
      // prompt() throws if it is already open or the user gesture was lost.
      return 'unavailable' as const
    } finally {
      // Single-use either way; drop it so the button retires.
      deferredPrompt = null
      notify()
    }
  }

  return { installed, canPrompt, platform, promptInstall }
}
