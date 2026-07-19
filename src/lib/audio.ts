// Hymn accompaniment player.
//
// Recordings are full performances covering every verse, so unlike the MIDI
// engine this replaced there is no synthesis, no soundfont, and no repeating
// the tune per verse — the file simply plays.
//
// A single <audio> element is reused for the whole app. Because it is an
// ordinary media element, mirroring the phone to a TV (AirPlay, Google Cast,
// HDMI) carries the sound along with the picture, and the OS lock-screen
// controls work for free.

export type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable' | 'error'

export type AudioState = {
  status: AudioStatus
  /** SDAH number the state refers to (null when idle). */
  hymnNumber: number | null
  /** Seconds elapsed and total, for the progress readout. */
  position: number
  duration: number
}

let el: HTMLAudioElement | null = null
let state: AudioState = { status: 'idle', hymnNumber: null, position: 0, duration: 0 }
const listeners = new Set<() => void>()

function setState(next: Partial<AudioState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

export function getAudioState(): AudioState {
  return state
}

export function subscribeAudio(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Recordings total ~1 GB, which is too much for a git repository. They live
// in public/audio for local development and can be served from anywhere in
// production by setting VITE_AUDIO_BASE (e.g. a Cloudflare R2 or B2 bucket).
const AUDIO_BASE =
  import.meta.env.VITE_AUDIO_BASE?.replace(/\/?$/, '/') ?? `${import.meta.env.BASE_URL}audio/`

export function audioUrl(hymnNumber: number): string {
  return `${AUDIO_BASE}${hymnNumber}.mp3`
}

function ensureElement(): HTMLAudioElement {
  if (el) return el
  el = new Audio()
  el.preload = 'none'

  el.addEventListener('playing', () => setState({ status: 'playing' }))
  el.addEventListener('pause', () => {
    // A pause fired at the very end is the track finishing, not the user.
    if (state.status === 'playing') setState({ status: 'paused' })
  })
  el.addEventListener('ended', () =>
    setState({ status: 'idle', hymnNumber: null, position: 0, duration: 0 }),
  )
  el.addEventListener('timeupdate', () =>
    setState({ position: el!.currentTime, duration: el!.duration || 0 }),
  )
  el.addEventListener('loadedmetadata', () => setState({ duration: el!.duration || 0 }))
  el.addEventListener('error', () => {
    // A missing file is a gap in the recordings, not a failure to report.
    setState({ status: el?.error?.code === 4 ? 'unavailable' : 'error' })
  })

  return el
}

/** True when a recording exists for this hymn. */
export async function hasRecording(hymnNumber: number): Promise<boolean> {
  try {
    const res = await fetch(audioUrl(hymnNumber), { method: 'HEAD' })
    return res.ok && (res.headers.get('content-type')?.includes('audio') ?? true)
  } catch {
    return false
  }
}

export async function playHymn(hymnNumber: number): Promise<void> {
  const audio = ensureElement()

  // Resume if this hymn is merely paused.
  if (state.hymnNumber === hymnNumber && state.status === 'paused') {
    await audio.play().catch(() => setState({ status: 'error' }))
    return
  }

  setState({ status: 'loading', hymnNumber, position: 0, duration: 0 })
  audio.src = audioUrl(hymnNumber)
  audio.currentTime = 0

  try {
    await audio.play()
  } catch {
    // Autoplay rejection or a missing file; the error handler refines this.
    if (state.status === 'loading') setState({ status: 'error' })
  }
}

export function pauseAudio(): void {
  if (!el || state.status !== 'playing') return
  el.pause()
}

export function stopAudio(): void {
  if (el) {
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
  setState({ status: 'idle', hymnNumber: null, position: 0, duration: 0 })
}

/** Jump to a point in the recording, as a fraction 0–1. */
export function seekTo(fraction: number): void {
  if (!el || !state.duration) return
  el.currentTime = Math.max(0, Math.min(1, fraction)) * state.duration
}
