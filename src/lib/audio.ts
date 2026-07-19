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

/**
 * Why a hymn cannot be played right now.
 *
 * 'none' — never recorded. A real gap in the library, and the reader should
 *   be told so plainly.
 * 'offline' — recorded, but this copy has not been downloaded and there is no
 *   connection to fetch it.
 * 'unreachable' — recorded, we are online, and the file still will not load.
 *   That is our problem, not the hymn's, and it must not be dressed up as a
 *   missing recording. It is exactly what happened when the mp3s stopped
 *   being deployed: every hymn reported itself as never recorded.
 */
export type Availability = 'ready' | 'none' | 'offline' | 'unreachable'

/**
 * Which hymns were recorded at all, loaded once.
 *
 * This used to be a HEAD request per hymn, which could not distinguish a hymn
 * that was never recorded from a file missing off the server — both answered
 * 404. The manifest settles the question without touching the network.
 */
let manifest: Set<number> | null = null
let manifestLoad: Promise<Set<number>> | null = null

function loadManifest(): Promise<Set<number>> {
  if (manifest) return Promise.resolve(manifest)
  manifestLoad ??= fetch(`${import.meta.env.BASE_URL}data/recordings.json`)
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])
    .then((list: number[]) => {
      manifest = new Set(list)
      return manifest
    })
  return manifestLoad
}

/** Whether this hymn can be played, and if not, why not. */
export async function recordingAvailability(hymnNumber: number): Promise<Availability> {
  const url = audioUrl(hymnNumber)

  // A downloaded copy plays regardless of the network or the manifest.
  if (await cachedResponse(url)) return 'ready'

  const recorded = await loadManifest()
  // An empty manifest means it could not be loaded; fall back to trying, so a
  // manifest problem never suppresses music that is actually there.
  if (recorded.size > 0 && !recorded.has(hymnNumber)) return 'none'

  if (!navigator.onLine) return 'offline'

  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok ? 'ready' : 'unreachable'
  } catch {
    return navigator.onLine ? 'unreachable' : 'offline'
  }
}

// Recordings are cached by hand rather than by the service worker. A media
// element streams with Range requests, and an installed PWA — iOS in
// particular — fails when a worker answers those, which is why playback broke
// once the app was added to the home screen. Keeping media off the worker and
// serving offline copies as blobs avoids the problem entirely.
const AUDIO_CACHE = 'hymn-audio'
const MAX_CACHED = 120

/** The object URL currently in use, revoked when we move on. */
let objectUrl: string | null = null

function releaseObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
}

async function cachedResponse(url: string): Promise<Response | undefined> {
  if (!('caches' in globalThis)) return undefined
  try {
    return await (await caches.open(AUDIO_CACHE)).match(url)
  } catch {
    return undefined
  }
}

/** Store a complete copy so the hymn plays again without a signal. */
async function storeRecording(url: string): Promise<void> {
  if (!('caches' in globalThis)) return
  try {
    const cache = await caches.open(AUDIO_CACHE)
    if (await cache.match(url)) return

    const res = await fetch(url) // plain GET: a full 200, not a 206 slice
    if (!res.ok) return
    await cache.put(url, res)

    // Keep the cache bounded — oldest first.
    const keys = await cache.keys()
    for (const stale of keys.slice(0, Math.max(0, keys.length - MAX_CACHED))) {
      await cache.delete(stale)
    }
  } catch {
    /* offline or storage full — playback is unaffected */
  }
}

export async function playHymn(hymnNumber: number): Promise<void> {
  const audio = ensureElement()
  const url = audioUrl(hymnNumber)

  // Resume if this hymn is merely paused.
  if (state.hymnNumber === hymnNumber && state.status === 'paused') {
    await audio.play().catch(() => setState({ status: 'error' }))
    return
  }

  setState({ status: 'loading', hymnNumber, position: 0, duration: 0 })

  // Prefer an offline copy; otherwise stream from the network and keep one.
  const hit = await cachedResponse(url)
  releaseObjectUrl()
  if (hit) {
    objectUrl = URL.createObjectURL(await hit.blob())
    audio.src = objectUrl
  } else {
    audio.src = url
    void storeRecording(url)
  }
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
  releaseObjectUrl()
  setState({ status: 'idle', hymnNumber: null, position: 0, duration: 0 })
}

/** Jump to a point in the recording, as a fraction 0–1. */
export function seekTo(fraction: number): void {
  if (!el || !state.duration) return
  el.currentTime = Math.max(0, Math.min(1, fraction)) * state.duration
}
