import { useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Availability } from '../lib/audio'
import {
  RATES,
  getAudioState,
  pauseAudio,
  playHymn,
  recordingAvailability,
  setRate,
  stepRate,
  subscribeAudio,
} from '../lib/audio'
import { useOnline } from '../hooks/useOnline'
import { MusicOffIcon, PauseIcon, PlayIcon } from './icons'

export function useAudioState() {
  return useSyncExternalStore(subscribeAudio, getAudioState)
}

const mmss = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

/**
 * Play/pause control for a hymn's recording, with a progress ring so singers
 * can see how far through the accompaniment is. Two skins: 'paper' floats
 * over the reading view, 'stage' sits in the dark presenter.
 */
export function AudioButton({
  hymnNumber,
  variant = 'paper',
}: {
  hymnNumber: number
  variant?: 'paper' | 'stage'
}) {
  const state = useAudioState()
  const online = useOnline()
  const mine = state.hymnNumber === hymnNumber
  const status = mine ? state.status : 'idle'

  // Recordings cover almost every hymn but not all, and "not all" is not the
  // only reason one might not play — see Availability.
  const [available, setAvailable] = useState<Availability | null>(null)
  useEffect(() => {
    let cancelled = false
    setAvailable(null)
    void recordingAvailability(hymnNumber).then((a) => {
      if (!cancelled) setAvailable(a)
    })
    return () => {
      cancelled = true
    }
  }, [hymnNumber, online])

  const skin =
    variant === 'stage'
      ? 'bg-white/5 text-[#c7ccd0] hover:bg-white/15'
      : 'glass hairline text-[var(--ink-2)] shadow-[var(--shadow-float)] hover:text-[var(--ink)]'

  if ((available !== null && available !== 'ready') || status === 'unavailable' || status === 'error') {
    // Three different problems used to share one message — "no recording for
    // this hymn yet" — which is how a deployment that shipped without any of
    // the mp3s looked identical to a hymn nobody ever recorded. Say which.
    const reason: Availability | 'failed' =
      status === 'error' ? 'failed' : (available ?? 'unreachable')

    const copy = {
      none: {
        label: 'No recording for this hymn',
        title: 'This hymn has not been recorded yet',
      },
      offline: {
        label: 'Recording needs a connection',
        title:
          'This recording has not been downloaded yet — connect to play it once, then it works offline',
      },
      unreachable: {
        label: 'Recordings unavailable',
        title:
          'The recordings cannot be reached right now. This is a problem with the app, not with the hymn — please try again later.',
      },
      failed: { label: 'Playback failed', title: 'Playback failed — try again' },
      ready: { label: '', title: '' },
    }[reason]

    return (
      <button
        disabled
        aria-label={copy.label}
        title={copy.title}
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full opacity-40 ${skin}`}
      >
        <MusicOffIcon />
      </button>
    )
  }

  const playing = status === 'playing'
  const loading = status === 'loading' || available === null
  const progress = mine && state.duration > 0 ? state.position / state.duration : 0

  // The control is a circle at rest and a capsule while the music runs: play,
  // then a step down, the current speed, a step up. Expanding only while
  // playing keeps the words clear the rest of the time, and means the speed is
  // never something to go hunting for at the moment it is wanted.
  const expanded = mine && (playing || status === 'paused')

  const stage = variant === 'stage'
  const stepSkin = stage
    ? 'text-[#c7ccd0] hover:bg-white/10 disabled:opacity-25'
    : 'text-[var(--ink-2)] hover:bg-[var(--accent)]/12 disabled:opacity-30'

  return (
    <motion.div
      layout
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex items-center rounded-full ${expanded ? (stage ? 'bg-white/5' : 'glass hairline shadow-[var(--shadow-float)]') : ''}`}
    >
      {/* Progress ring, drawn only while this hymn is the one playing. */}
      {expanded && state.duration > 0 && (
        <svg
          aria-hidden
          viewBox="0 0 52 52"
          className="pointer-events-none absolute left-0 top-0 h-[52px] w-[52px] -rotate-90"
        >
          <circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            strokeWidth="2"
            className={stage ? 'stroke-white/15' : 'stroke-[var(--line-strong)]'}
          />
          <circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - progress}
            className={stage ? 'stroke-white/80' : 'stroke-[var(--accent)]'}
          />
        </svg>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation()
          if (playing) pauseAudio()
          else void playHymn(hymnNumber)
        }}
        disabled={loading}
        aria-label={playing ? 'Pause accompaniment' : 'Play accompaniment'}
        title={playing ? 'Pause' : 'Play the hymn'}
        className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full transition-colors ${expanded ? (stage ? 'text-[#c7ccd0]' : 'text-[var(--ink-2)]') : skin}`}
      >
        {loading ? (
          <span
            aria-hidden
            className="h-5 w-5 animate-spin rounded-full border-[1.8px] border-current border-t-transparent opacity-70"
          />
        ) : playing ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="rate"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center overflow-hidden"
          >
            <button
              onClick={() => stepRate(-1)}
              disabled={state.rate <= RATES[0]}
              aria-label="Play slower"
              title="Slower"
              className={`flex h-11 w-11 items-center justify-center rounded-full text-[20px] leading-none transition-colors ${stepSkin}`}
            >
              −
            </button>

            {/* Tapping the reading returns to the recorded tempo — the one
                speed people want back most often, and otherwise several taps
                away from either end. */}
            <button
              onClick={() => setRate(1)}
              disabled={state.rate === 1}
              aria-label={`Playing at ${state.rate} times speed${state.rate === 1 ? '' : ' — tap for normal'}`}
              title={state.rate === 1 ? 'Recorded tempo' : 'Back to normal speed'}
              className={`h-11 w-11 text-center text-[12.5px] font-semibold tabular-nums transition-colors ${
                state.rate === 1
                  ? stage
                    ? 'text-[#7a8187]'
                    : 'text-[var(--ink-3)]'
                  : stage
                    ? 'text-white'
                    : 'text-[var(--accent-ink)]'
              }`}
            >
              {state.rate}×
            </button>

            <button
              onClick={() => stepRate(1)}
              disabled={state.rate >= RATES[RATES.length - 1]}
              aria-label="Play faster"
              title="Faster"
              className={`mr-0.5 flex h-11 w-11 items-center justify-center rounded-full text-[20px] leading-none transition-colors sm:mr-1 ${stepSkin}`}
            >
              +
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {mine && (playing || status === 'paused') && state.duration > 0 && (
        <span
          className={`pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10.5px] tabular-nums ${
            variant === 'stage' ? 'text-[#7a8187]' : 'text-[var(--ink-3)]'
          }`}
        >
          {mmss(state.position)} / {mmss(state.duration)}
        </span>
      )}
    </motion.div>
  )
}
