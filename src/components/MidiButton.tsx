import { useSyncExternalStore } from 'react'
import { getMidiState, pauseMidi, playHymn, subscribeMidi } from '../lib/midi'
import { MusicOffIcon, PauseIcon, PlayIcon } from './icons'

export function useMidiState() {
  return useSyncExternalStore(subscribeMidi, getMidiState)
}

// Round play/pause control for a hymn's accompaniment. Two skins: 'paper'
// floats over the reading view, 'stage' sits in the dark presenter.
export function MidiButton({
  hymnNumber,
  variant = 'paper',
}: {
  hymnNumber: number
  variant?: 'paper' | 'stage'
}) {
  const state = useMidiState()
  const mine = state.hymnNumber === hymnNumber
  const status = mine ? state.status : 'idle'

  const skin =
    variant === 'stage'
      ? 'bg-white/5 text-[#c7ccd0] hover:bg-white/15'
      : 'glass hairline text-[var(--ink-2)] shadow-[var(--shadow-float)] hover:text-[var(--ink)]'

  if (status === 'unavailable' || status === 'error') {
    return (
      <button
        disabled
        aria-label="Accompaniment not available"
        title={
          status === 'error'
            ? 'Playback failed — try again later'
            : 'No accompaniment recorded for this number yet'
        }
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full opacity-40 ${skin}`}
      >
        <MusicOffIcon />
      </button>
    )
  }

  const playing = status === 'playing'
  const loading = status === 'loading'

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        if (playing) pauseMidi()
        else void playHymn(hymnNumber)
      }}
      disabled={loading}
      aria-label={playing ? 'Pause accompaniment' : 'Play accompaniment'}
      title={playing ? 'Pause' : 'Play the hymn tune'}
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
  )
}
