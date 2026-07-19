import { useEffect, useState, useSyncExternalStore } from 'react'
import { getAudioState, hasRecording, pauseAudio, playHymn, subscribeAudio } from '../lib/audio'
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
  const mine = state.hymnNumber === hymnNumber
  const status = mine ? state.status : 'idle'

  // Recordings cover almost every hymn but not all; check before offering it.
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    setAvailable(null)
    void hasRecording(hymnNumber).then((ok) => {
      if (!cancelled) setAvailable(ok)
    })
    return () => {
      cancelled = true
    }
  }, [hymnNumber])

  const skin =
    variant === 'stage'
      ? 'bg-white/5 text-[#c7ccd0] hover:bg-white/15'
      : 'glass hairline text-[var(--ink-2)] shadow-[var(--shadow-float)] hover:text-[var(--ink)]'

  if (available === false || status === 'unavailable' || status === 'error') {
    return (
      <button
        disabled
        aria-label="Recording not available"
        title={
          status === 'error'
            ? 'Playback failed — try again'
            : 'No recording for this hymn yet'
        }
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full opacity-40 ${skin}`}
      >
        <MusicOffIcon />
      </button>
    )
  }

  const playing = status === 'playing'
  const loading = status === 'loading' || available === null
  const progress = mine && state.duration > 0 ? state.position / state.duration : 0

  return (
    <div className="relative">
      {/* Progress ring, drawn only while this hymn is the one playing. */}
      {mine && (playing || status === 'paused') && state.duration > 0 && (
        <svg
          aria-hidden
          viewBox="0 0 52 52"
          className="pointer-events-none absolute inset-0 h-[52px] w-[52px] -rotate-90"
        >
          <circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            strokeWidth="2"
            className={variant === 'stage' ? 'stroke-white/15' : 'stroke-[var(--line-strong)]'}
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
            className={variant === 'stage' ? 'stroke-white/80' : 'stroke-[var(--accent)]'}
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
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full transition-colors ${skin}`}
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

      {mine && (playing || status === 'paused') && state.duration > 0 && (
        <span
          className={`pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10.5px] tabular-nums ${
            variant === 'stage' ? 'text-[#7a8187]' : 'text-[var(--ink-3)]'
          }`}
        >
          {mmss(state.position)} / {mmss(state.duration)}
        </span>
      )}
    </div>
  )
}
