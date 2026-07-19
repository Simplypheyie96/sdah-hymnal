import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const MIN_SPLASH_MS = 4200

// Once per visit, not once per page load.
//
// The service worker updates itself on open and reloads the page to hand over
// the new version. That is the behaviour we want — nobody should have to think
// about updating a hymnal — but it meant the opening screen played, the page
// reloaded underneath it, and it played all over again. Four seconds is a nice
// welcome and a tiresome second helping.
//
// sessionStorage, deliberately: it survives the reload and clears when the tab
// or the installed app is closed, so the next real launch gets the full
// opening.
const SEEN_KEY = 'sdah.splashSeen'

function alreadySeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false // private mode — show it, which is the harmless direction
  }
}

const EASE = [0.22, 1, 0.36, 1] as const

// What the hymnal actually contains, said plainly. "1–920" meant nothing to
// anyone who hasn't been staring at the data.
const CONTENTS = ['Hymns', 'Calls to Worship', 'Invocations', 'Benedictions']

const STAFF = [0, 1, 2, 3, 4]

/**
 * Opening screen.
 *
 * Five hairlines draw outward like a musical staff, the app's own mark sits
 * on them, and the wordmark and contents settle underneath. The structure is
 * the ornament — an earlier version leaned on a wash of accent colour behind
 * the logo, which read as a smudge rather than as a design.
 *
 * Every animation here is opacity or transform only. Anything that forces a
 * repaint per frame (stroke drawing, scaling a painted gradient) stutters on
 * a phone that is also parsing the hymn data behind this screen.
 */
export function Splash({ ready }: { ready: boolean }) {
  const [seen] = useState(alreadySeen)
  const [minElapsed, setMinElapsed] = useState(seen)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    if (seen) return
    const t = window.setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [seen])

  // The wordmark is set in Bodoni, which arrives over the network. With
  // `display=swap` it paints in a fallback serif first and then snaps to the
  // real face — a visible jolt, directly under the reader's eye, because the
  // splash is the first thing they see. Holding the content back until the
  // faces have loaded costs a beat of the 4.2s we were spending anyway.
  //
  // Capped so a slow or failed font fetch can never hold the splash open.
  useEffect(() => {
    let done = false
    const settle = () => {
      if (!done) {
        done = true
        setFontsReady(true)
      }
    }
    if (document.fonts) void document.fonts.ready.then(settle)
    else settle()
    const t = window.setTimeout(settle, 1800)
    return () => window.clearTimeout(t)
  }, [])

  const show = !(ready && minElapsed)

  useEffect(() => {
    if (show) return
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* nothing to remember it with; the splash simply plays again */
    }
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: EASE }}
          className="grain-local fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[var(--paper)]"
          aria-label="Opening the hymnal"
        >
          {/* Held until the faces have loaded — see fontsReady above. The
              paper ground is already painted, so there is nothing to see
              during the wait but the background. */}
          {fontsReady && (
          <div className="relative flex w-full flex-col items-center px-8 text-center">
            {/* The staff, and the mark resting on it. */}
            <div className="relative flex w-full items-center justify-center">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col gap-[13px]"
                style={{
                  // Fade the lines out well before the screen edge so they
                  // read as a staff rather than as page rules.
                  maskImage:
                    'linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)',
                }}
              >
                {STAFF.map((i) => (
                  <motion.div
                    key={i}
                    className="h-px w-full origin-center bg-[var(--ink-3)] opacity-30"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1.2, ease: EASE, delay: 0.1 + i * 0.08 }}
                  />
                ))}
              </div>

              {/* Paper either side knocks the staff out from behind the mark. */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
                className="relative bg-[var(--paper)] px-7"
              >
                <svg width="94" height="94" viewBox="94 140 324 262" aria-hidden>
                  <path
                    d="M248 168c-40-28-96-38-148-27a8 8 0 0 0-6 8v190a8 8 0 0 0 10 8c46-10 96-2 134 22a8 8 0 0 0 10-7V168z"
                    fill="var(--accent-ink)"
                  />
                  <path
                    d="M264 168c40-28 96-38 148-27a8 8 0 0 1 6 8v190a8 8 0 0 1-10 8c-46-10-96-2-134 22a8 8 0 0 1-10-7V168z"
                    fill="var(--accent-ink)"
                  />
                  <rect x="250" y="152" width="12" height="238" rx="6" fill="var(--ink-3)" />
                  <g fill="var(--paper)">
                    <rect x="126" y="232" width="92" height="12" rx="6" />
                    <rect x="126" y="274" width="66" height="12" rx="6" />
                  </g>
                  <g fill="var(--paper)">
                    <rect x="344" y="212" width="11" height="92" rx="5" />
                    <path d="M355 212c26 10 42 24 44 44 1 12-3 22-11 30 3-16-3-28-16-36-9-6-14-10-17-16v-22z" />
                    <ellipse cx="326" cy="304" rx="30" ry="23" transform="rotate(-19 326 304)" />
                  </g>
                </svg>
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.85 }}
              className="eyebrow mt-11 text-[var(--ink-3)]"
            >
              Seventh-day Adventist
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 1 }}
              className="display-title mt-2 text-[50px] leading-none tracking-[-0.02em] text-[var(--accent-ink)]"
            >
              Hymnal
            </motion.h1>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, ease: EASE, delay: 1.25 }}
              className="mt-7 h-px w-20 origin-center bg-[var(--accent)] opacity-40"
            />

            {/* The point of the app, spelled out. */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
              {CONTENTS.map((item, i) => (
                <motion.span
                  key={item}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 1.45 + i * 0.16 }}
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
          )}

          {fontsReady && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 2.1 }}
            className="absolute bottom-[max(env(safe-area-inset-bottom),30px)] px-8 text-center text-[12px] leading-relaxed tracking-wide text-[var(--ink-3)]"
          >
            The complete hymnal — in English and Yorùbá
          </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
