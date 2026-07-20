import { useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  RATES,
  getAudioState,
  getRate,
  pauseAudio,
  playHymn,
  setRate,
  stopAudio,
  subscribeAudio,
} from '../lib/audio'
import { PauseIcon, PlayIcon } from './icons'

/**
 * Three ways to offer playback speed, side by side on real audio.
 *
 * Reached at /?lab=speed. This is a scratch screen for choosing between
 * designs — once one is picked it moves into AudioButton and this file goes.
 * Deliberately not linked from anywhere in the app.
 */

const EASE = [0.22, 1, 0.36, 1] as const
const HYMN = 1

function useAudio() {
  return useSyncExternalStore(subscribeAudio, getAudioState)
}

function useThisHymn() {
  const state = useAudio()
  const mine = state.hymnNumber === HYMN
  return {
    playing: mine && state.status === 'playing',
    loading: mine && state.status === 'loading',
    progress: mine && state.duration > 0 ? state.position / state.duration : 0,
    rate: state.rate,
  }
}

const step = (dir: number) => {
  const i = RATES.indexOf(getRate() as (typeof RATES)[number])
  const next = RATES[Math.min(RATES.length - 1, Math.max(0, (i === -1 ? 2 : i) + dir))]
  setRate(next)
}

const label = (r: number) => `${r}×`

function Ring({ progress, size = 52 }: { progress: number; size?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 52 52"
      style={{ width: size, height: size }}
      className="pointer-events-none absolute inset-0 -rotate-90"
    >
      <circle cx="26" cy="26" r="24" fill="none" strokeWidth="2" className="stroke-[var(--line-strong)]" />
      <circle
        cx="26" cy="26" r="24" fill="none" strokeWidth="2" strokeLinecap="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress}
        className="stroke-[var(--accent)]"
      />
    </svg>
  )
}

function PlayPause({ playing, loading }: { playing: boolean; loading: boolean }) {
  return (
    <button
      onClick={() => (playing ? pauseAudio() : void playHymn(HYMN))}
      aria-label={playing ? 'Pause' : 'Play'}
      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]" />
      ) : playing ? (
        <PauseIcon />
      ) : (
        <PlayIcon />
      )}
    </button>
  )
}

/** A — the button grows into a capsule while playing. */
function VariantCapsule() {
  const { playing, loading, progress, rate } = useThisHymn()
  const open = playing || loading

  return (
    <motion.div
      layout
      transition={{ duration: 0.42, ease: EASE }}
      className="glass hairline flex items-center rounded-full p-1 shadow-[var(--shadow-float)]"
    >
      <div className="relative">
        {open && <Ring progress={progress} />}
        <PlayPause playing={playing} loading={loading} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="rate"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.36, ease: EASE }}
            className="flex items-center overflow-hidden"
          >
            <button
              onClick={() => step(-1)}
              disabled={rate <= RATES[0]}
              aria-label="Slower"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[17px] text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)] disabled:opacity-25"
            >
              −
            </button>
            <span className="w-11 text-center text-[13px] font-semibold tabular-nums text-[var(--ink)]">
              {label(rate)}
            </span>
            <button
              onClick={() => step(1)}
              disabled={rate >= RATES[RATES.length - 1]}
              aria-label="Faster"
              className="mr-1 flex h-9 w-9 items-center justify-center rounded-full text-[17px] text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)] disabled:opacity-25"
            >
              +
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** B — a small rate chip beside the button. */
function VariantChip() {
  const { playing, loading, progress, rate } = useThisHymn()
  const open = playing || loading

  const cycle = () => {
    const i = RATES.indexOf(getRate() as (typeof RATES)[number])
    setRate(RATES[((i === -1 ? 2 : i) + 1) % RATES.length])
  }

  return (
    <div className="flex items-center gap-2">
      <div className="glass hairline relative rounded-full p-1 shadow-[var(--shadow-float)]">
        {open && <Ring progress={progress} />}
        <PlayPause playing={playing} loading={loading} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.button
            key="chip"
            initial={{ opacity: 0, scale: 0.8, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={cycle}
            aria-label={`Playback speed ${label(rate)}, tap to change`}
            className="glass hairline h-9 rounded-full px-3.5 text-[13px] font-semibold tabular-nums text-[var(--ink)] shadow-[var(--shadow-soft)]"
          >
            {label(rate)}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

/** C — hold the button to reveal a track. */
function VariantHold() {
  const { playing, loading, progress, rate } = useThisHymn()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('pointerup', close)
    return () => window.removeEventListener('pointerup', close)
  }, [open])

  return (
    <div className="relative">
      <div
        className="glass hairline relative rounded-full p-1 shadow-[var(--shadow-float)]"
        onPointerDown={() => {
          const t = window.setTimeout(() => setOpen(true), 380)
          const cancel = () => {
            window.clearTimeout(t)
            window.removeEventListener('pointerup', cancel)
          }
          window.addEventListener('pointerup', cancel)
        }}
      >
        {(playing || loading) && <Ring progress={progress} />}
        <PlayPause playing={playing} loading={loading} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="glass hairline absolute left-1/2 top-[60px] flex -translate-x-1/2 items-center gap-1 rounded-full p-1 shadow-[var(--shadow-float)]"
          >
            {RATES.map((r) => (
              <button
                key={r}
                onPointerUp={() => setRate(r)}
                className={`h-8 rounded-full px-2.5 text-[12.5px] font-semibold tabular-nums transition-colors ${
                  rate === r
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'text-[var(--ink-2)]'
                }`}
              >
                {label(r)}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const VARIANTS = [
  {
    key: 'A',
    name: 'Player expands into a capsule',
    note: 'Press play and the circle grows into a pill. Speed is right there, no hunting — but the control is wider while music is on.',
    render: () => <VariantCapsule />,
  },
  {
    key: 'B',
    name: 'Small rate chip beside play',
    note: 'A “1×” pill appears next to the button. Tap it to step through the speeds and wrap around. Compact, one tap, but cycling means passing through speeds you did not want.',
    render: () => <VariantChip />,
  },
  {
    key: 'C',
    name: 'Hold play to reveal a track',
    note: 'Press and hold the button for a moment. Nothing on screen at rest, which keeps the words clear — but nobody discovers it without being told.',
    render: () => <VariantHold />,
  },
]

export function SpeedLab() {
  useEffect(() => () => stopAudio(), [])

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-6 pb-24 pt-[max(env(safe-area-inset-top),32px)]">
      <p className="eyebrow pt-6 text-[var(--ink-3)]">Choosing a control</p>
      <h1 className="font-lyrics mt-1.5 text-[38px] font-[350] leading-none tracking-[-0.02em]">
        Playback speed
      </h1>
      <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--ink-2)]">
        All three play hymn 1 for real, and they share one player — so pressing play in
        one and changing speed in another does what you would expect. The pitch is held
        steady as the tempo moves, which is what lets a congregation still sing along.
      </p>

      <div className="mt-10 space-y-10">
        {VARIANTS.map((v) => (
          <section key={v.key} className="hairline rounded-3xl bg-[var(--paper-raised)] p-6">
            <p className="eyebrow text-[var(--ink-3)]">Option {v.key}</p>
            <h2 className="font-lyrics mt-1.5 text-[21px] font-[450]">{v.name}</h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--ink-2)]">{v.note}</p>
            <div className="mt-7 flex min-h-[120px] items-start justify-center pt-2">
              {v.render()}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-[12.5px] leading-relaxed text-[var(--ink-3)]">
        Tell me which one, and it replaces the plain play button everywhere —
        in the reader and in the presenter.
      </p>
    </div>
  )
}
