import { useState, useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useInstall } from '../hooks/useInstall'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { InstallIcon, CheckIcon, ShareIcon } from './icons'

const EASE = [0.22, 1, 0.36, 1] as const

// Once dismissed, never again. The app's whole manner is to say a thing once
// and then trust the reader; a home-screen nudge that returns every visit
// would be the one nagging note in it. Settings keeps a permanent, quiet way
// to install for anyone who changes their mind.
const DISMISS_KEY = 'sdah.installNudge.dismissed'

/** The iPhone/iPad walkthrough, shown as a bottom sheet. */
export function IosInstallSheet({ onClose }: { onClose: () => void }) {
  // A dialog should close on Escape, not only on a tap outside it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const steps: { n: number; body: ReactNode }[] = [
    {
      n: 1,
      body: (
        <>
          Tap the{' '}
          <span className="mx-0.5 inline-flex translate-y-0.5 text-[var(--accent-ink)]">
            <ShareIcon size={16} />
          </span>{' '}
          Share button in Safari&rsquo;s toolbar.
        </>
      ),
    },
    { n: 2, body: <>Scroll the grey list and choose &ldquo;Add to Home Screen&rdquo;.</> },
    { n: 3, body: <>Tap &ldquo;Add&rdquo;. The hymnal lands on your home screen like any app.</> },
  ]

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />
      <motion.div
        role="dialog"
        aria-label="How to add the hymnal to your home screen"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.42, ease: EASE }}
        className="glass hairline relative w-full max-w-md rounded-t-3xl px-6 pt-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-[var(--shadow-float)]"
      >
        <div aria-hidden className="mx-auto mb-5 h-1 w-10 rounded-full bg-[var(--line-strong)]" />
        <p className="eyebrow text-[var(--ink-3)]">On iPhone &amp; iPad</p>
        <h2 className="font-lyrics mt-1.5 text-[26px] font-[350] leading-tight tracking-[-0.01em]">
          Add to Home Screen
        </h2>

        <ol className="mt-5 space-y-4">
          {steps.map((s) => (
            <li key={s.n} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-[var(--accent-contrast)] tabular-nums">
                {s.n}
              </span>
              <p className="text-[14px] leading-relaxed text-[var(--ink-2)]">{s.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
          It has to be Safari — from Chrome on an iPhone the option is not offered. Once added it
          opens full screen with its own icon and works without a signal.
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-[var(--accent)] py-3 text-[14px] font-semibold text-[var(--accent-contrast)]"
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  )
}

/**
 * The home-screen nudge, floating above the tab bar on the Hymns tab.
 *
 * It appears only when there is something to offer — a native prompt waiting,
 * or an iPhone that can be walked through it — and only until the reader either
 * installs or waves it away once.
 */
export function InstallBanner() {
  const { installed, canPrompt, platform, promptInstall } = useInstall()
  const [dismissed, setDismissed] = useLocalStorage(DISMISS_KEY, false)
  const [sheet, setSheet] = useState(false)

  const eligible = !installed && !dismissed && (canPrompt || platform === 'ios')

  async function act() {
    if (canPrompt) {
      // The reader has now seen the real dialog and answered it; either way we
      // have asked, so retire the nudge.
      await promptInstall()
      setDismissed(true)
    } else {
      setSheet(true)
    }
  }

  return (
    <>
      <AnimatePresence>
        {eligible && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+86px)] z-30 px-4"
          >
            <div className="glass hairline pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl py-3 pl-3.5 pr-2.5 shadow-[var(--shadow-float)]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]">
                <InstallIcon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-tight text-[var(--ink)]">
                  Keep the hymnal on your phone
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-[var(--ink-3)]">
                  Full screen · works without a signal
                </p>
              </div>
              <button
                onClick={act}
                className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-[12.5px] font-semibold text-[var(--accent-contrast)]"
              >
                {canPrompt ? 'Install' : 'How'}
              </button>
              <button
                onClick={() => setDismissed(true)}
                aria-label="Not now"
                className="shrink-0 px-1.5 text-[18px] leading-none text-[var(--ink-3)]"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{sheet && <IosInstallSheet onClose={() => setSheet(false)} />}</AnimatePresence>
    </>
  )
}

/**
 * The install control in Settings — the deliberate, always-available route, as
 * opposed to the banner's one-time offer. A one-tap button where the browser
 * allows one, a quiet confirmation once installed, and otherwise just the value
 * of installing; the per-platform steps live beside it in Settings.
 */
export function InstallControls() {
  const { installed, canPrompt, promptInstall } = useInstall()

  if (installed) {
    return (
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]">
          <CheckIcon size={17} />
        </span>
        <p className="text-[14px] leading-relaxed text-[var(--ink-2)]">
          Installed on this device — it opens full screen from your home screen.
        </p>
      </div>
    )
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]">
          <InstallIcon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">Add to your home screen</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
            Its own icon, full screen, works offline.
          </p>
        </div>
      </div>

      {canPrompt && (
        <button
          onClick={() => void promptInstall()}
          className="mt-4 w-full rounded-full bg-[var(--accent)] py-2.5 text-[13px] font-semibold text-[var(--accent-contrast)]"
        >
          Install app
        </button>
      )}
    </div>
  )
}
