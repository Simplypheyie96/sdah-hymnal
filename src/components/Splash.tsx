import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const MIN_SPLASH_MS = 4200

const EASE = [0.22, 1, 0.36, 1] as const

// What the hymnal actually contains, said plainly. "1–920" meant nothing to
// anyone who hasn't been staring at the data.
const CONTENTS = ['Hymns', 'Calls to Worship', 'Invocations', 'Benedictions']

/**
 * Opening screen. The app's own mark opens, the wordmark settles, and the
 * contents fade up one after another — long enough to be read, which is what
 * makes the wait feel intended rather than slow.
 *
 * Every animation here is opacity or transform only. Anything that forces a
 * repaint per frame (stroke drawing, scaling a painted gradient) stutters on
 * a phone that is also parsing the hymn data behind this screen.
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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: EASE }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[var(--paper)]"
          aria-label="Opening the hymnal"
        >
          {/* A slow wash of the theme colour breathing behind everything. */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="pointer-events-none absolute h-[560px] w-[560px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, color-mix(in oklab, var(--accent) 12%, transparent) 0%, transparent 68%)',
              willChange: 'opacity',
              transform: 'translateZ(0)',
            }}
          />

          <div className="relative flex flex-col items-center px-8 text-center">
            {/* The app icon's own artwork, so the splash and the home-screen
                icon are unmistakably the same mark. Only the ink ground is
                dropped — that belongs to the tile, not to the glyph.

                Everything animates on opacity and transform alone. The old
                version drew the outline with pathLength, which repaints the
                whole SVG every frame and stuttered badly on a phone. */}
            <motion.svg
              width="94"
              height="94"
              viewBox="94 140 324 262"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: EASE }}
              aria-hidden
            >
              {/* Two pages fanning from the spine, settling open. */}
              <motion.path
                d="M248 168c-40-28-96-38-148-27a8 8 0 0 0-6 8v190a8 8 0 0 0 10 8c46-10 96-2 134 22a8 8 0 0 0 10-7V168z"
                fill="var(--accent-ink)"
                style={{ originX: '256px', originY: '270px' }}
                initial={{ opacity: 0, rotate: -7 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 1, ease: EASE, delay: 0.1 }}
              />
              <motion.path
                d="M264 168c40-28 96-38 148-27a8 8 0 0 1 6 8v190a8 8 0 0 1-10 8c-46-10-96-2-134 22a8 8 0 0 1-10-7V168z"
                fill="var(--accent-ink)"
                style={{ originX: '256px', originY: '270px' }}
                initial={{ opacity: 0, rotate: 7 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 1, ease: EASE, delay: 0.1 }}
              />

              <motion.rect
                x="250" y="152" width="12" height="238" rx="6"
                fill="var(--ink-3)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
              />

              {/* Left page: the words. */}
              <motion.g
                fill="var(--paper)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.75 }}
              >
                <rect x="126" y="232" width="92" height="12" rx="6" />
                <rect x="126" y="274" width="66" height="12" rx="6" />
              </motion.g>

              {/* Right page: the tune. */}
              <motion.g
                fill="var(--paper)"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.95 }}
              >
                <rect x="344" y="212" width="11" height="92" rx="5" />
                <path d="M355 212c26 10 42 24 44 44 1 12-3 22-11 30 3-16-3-28-16-36-9-6-14-10-17-16v-22z" />
                <ellipse cx="326" cy="304" rx="30" ry="23" transform="rotate(-19 326 304)" />
              </motion.g>
            </motion.svg>

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
              transition={{ duration: 1.1, ease: EASE, delay: 1.15 }}
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
