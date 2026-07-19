import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const MIN_SPLASH_MS = 4200

const EASE = [0.22, 1, 0.36, 1] as const

// What the hymnal actually contains, said plainly. "1–920" meant nothing to
// anyone who hasn't been staring at the data.
const CONTENTS = ['Hymns', 'Calls to Worship', 'Invocations', 'Benedictions']

/**
 * Opening screen. An open book is drawn stroke by stroke, the wordmark
 * settles, and the contents fade up one after another — long enough to be
 * read, which is what makes the wait feel intended rather than slow.
 */
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
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.75, ease: EASE }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[var(--paper)]"
          aria-label="Opening the hymnal"
        >
          {/* A slow wash of the theme colour breathing behind everything. */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.6, ease: 'easeOut' }}
            className="pointer-events-none absolute h-[560px] w-[560px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, color-mix(in oklab, var(--accent) 12%, transparent) 0%, transparent 68%)',
            }}
          />

          <div className="relative flex flex-col items-center px-8 text-center">
            {/* Open book, drawn rather than dropped in. */}
            <svg
              width="86"
              height="86"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--accent-ink)]"
              aria-hidden
            >
              <motion.path
                d="M12 6.5C10.6 5 8.6 4.25 6 4.25c-1 0-1.9.12-2.75.36V18.4c.85-.24 1.75-.36 2.75-.36 2.6 0 4.6.75 6 2.21"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.15, ease: EASE, delay: 0.15 }}
              />
              <motion.path
                d="M12 6.5c1.4-1.5 3.4-2.25 6-2.25 1 0 1.9.12 2.75.36V18.4c-.85-.24-1.75-.36-2.75-.36-2.6 0-4.6.75-6 2.21"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.15, ease: EASE, delay: 0.35 }}
              />
              <motion.path
                d="M12 6.5v13.75"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: EASE, delay: 1.1 }}
              />
            </svg>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.75 }}
              className="eyebrow mt-9 text-[var(--ink-3)]"
            >
              Seventh-day Adventist
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.9 }}
              className="display-title mt-2 text-[50px] leading-none tracking-[-0.02em] text-[var(--accent-ink)]"
            >
              Hymnal
            </motion.h1>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, ease: EASE, delay: 1.05 }}
              className="mt-7 h-px w-20 origin-center bg-[var(--accent)] opacity-40"
            />

            {/* The point of the app, spelled out. */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
              {CONTENTS.map((item, i) => (
                <motion.span
                  key={item}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 1.3 + i * 0.16 }}
                  className="text-[13px] text-[var(--ink-2)]"
                >
                  {item}
                  {i < CONTENTS.length - 1 && (
                    <span aria-hidden className="ml-2.5 text-[var(--ink-3)]">
                      ·
                    </span>
                  )}
                </motion.span>
              ))}
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 2 }}
            className="absolute bottom-[max(env(safe-area-inset-bottom),30px)] px-8 text-center text-[12px] leading-relaxed tracking-wide text-[var(--ink-3)]"
          >
            The complete hymnal — in English and Yorùbá
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
