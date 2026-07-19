import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookIcon } from './icons'

const MIN_SPLASH_MS = 1100

// Opening screen: paper-quiet, just the mark and the wordmark. It holds
// while the English edition loads, then lifts away. A slow hairline draws
// underneath the title so the wait reads as intentional, not stalled.
export function Splash({ ready }: { ready: boolean }) {
  const [minElapsed, setMinElapsed] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [])

  const show = !(ready && minElapsed)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          exit={{ opacity: 0, scale: 1.015 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--paper)]"
          aria-label="Loading the hymnal"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center px-8 text-center"
          >
            <div className="hairline flex h-20 w-20 items-center justify-center rounded-[28px] bg-[var(--paper-raised)] text-[var(--ink-2)] shadow-[var(--shadow-soft)]">
              <BookIcon size={34} strokeWidth={1.4} />
            </div>
            <p className="mt-9 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--ink-3)]">
              Seventh-day Adventist
            </p>
            <h1 className="font-lyrics mt-2 text-[46px] font-[350] leading-none tracking-[-0.02em] text-[var(--ink)]">
              Hymnal
            </h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
              className="mt-8 h-px w-16 origin-center bg-[var(--line-strong)]"
            />
          </motion.div>

          <p className="absolute bottom-[max(env(safe-area-inset-bottom),28px)] text-[12px] tracking-wide text-[var(--ink-3)]">
            Hymns &amp; readings · 1–920
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
