import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * The "a new version is ready" nudge, floating above the tab bar.
 *
 * Shown when the service worker has a newer build waiting (see useAppUpdate).
 * Refresh takes it right away; Later hides the note for now — it returns on the
 * next launch, since the update keeps waiting until the reader takes it.
 */
export function UpdatePrompt({ show, onRefresh }: { show: boolean; onRefresh: () => void }) {
  const [dismissed, setDismissed] = useState(false)

  return (
    <AnimatePresence>
      {show && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.5, ease: EASE }}
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+86px)] z-40 px-4"
        >
          <div className="glass hairline pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl py-3 pl-4 pr-2.5 shadow-[var(--shadow-float)]">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium leading-tight text-[var(--ink)]">
                A new version is ready
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-[var(--ink-3)]">
                Refresh to get the latest hymns and fixes
              </p>
            </div>
            <button
              onClick={onRefresh}
              className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-[12.5px] font-semibold text-[var(--accent-contrast)]"
            >
              Refresh
            </button>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Later"
              className="shrink-0 px-1.5 text-[18px] leading-none text-[var(--ink-3)]"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
