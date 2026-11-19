import { iosApp } from './native'

// The store app on iPhone and iPad, connected to a TV, projector or monitor
// (AirPlay or a cable). Instead of mirroring the phone, the app puts its own
// landscape slide on that screen (TvSlide) and the phone becomes the remote.
// The native side lives in ios/App/App/SceneDelegate.swift.

export type Slide = {
  number: number
  title: string
  label: string
  lines: string[]
  refrain?: boolean
  response?: boolean
  position: string
} | null

type TvPlugin = {
  getState: () => Promise<{ connected: boolean }>
  show: (o: { slide: Slide }) => Promise<void>
  addListener: (e: 'change', cb: (s: { connected: boolean }) => void) => Promise<{ remove: () => void }>
}

// Wrapped in an object: a Capacitor plugin proxy answers to `.then`, so
// resolving a promise with the bare proxy would call a native 'then'.
let plugin: Promise<{ p: TvPlugin }> | null = null
const tv = () =>
  (plugin ??= import('@capacitor/core').then(({ registerPlugin }) => ({ p: registerPlugin<TvPlugin>('TvScreen') })))

/** Calls back with whether a TV is connected now, and again whenever that changes. */
export function watchTv(cb: (connected: boolean) => void): () => void {
  if (!iosApp) return () => {}
  let stop = false
  let handle: { remove: () => void } | undefined
  void tv().then(async ({ p }) => {
    const s = await p.getState().catch(() => ({ connected: false }))
    if (!stop) cb(s.connected)
    handle = await p.addListener('change', (e) => cb(e.connected))
    if (stop) handle.remove()
  })
  return () => {
    stop = true
    handle?.remove()
  }
}

/** Put a verse on the TV, or the resting screen when `slide` is null. */
export function showOnTv(slide: Slide) {
  if (iosApp) void tv().then(({ p }) => p.show({ slide }).catch(() => {}))
}
