// Hymn accompaniment player. One shared AudioContext + SoundFont synth for
// the whole app, created lazily on the first play tap so browser autoplay
// rules are satisfied. The synth (spessasynth_lib) and the ~6 MB soundfont
// only ever load if someone actually presses play.
//
// Because playback runs in the page's own audio context, mirroring the phone
// to a TV (AirPlay / Google Cast screen share, HDMI) carries the sound along
// with the picture — nothing extra to wire up for home devotions.
import type { Sequencer, WorkletSynthesizer } from 'spessasynth_lib'

export type MidiStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable' | 'error'

export type MidiState = {
  status: MidiStatus
  /** SDAH number the state refers to (null when idle). */
  hymnNumber: number | null
}

let ctx: AudioContext | null = null
let synth: WorkletSynthesizer | null = null
let sequencer: Sequencer | null = null
let endWatch: number | null = null

let state: MidiState = { status: 'idle', hymnNumber: null }
const listeners = new Set<() => void>()

function setState(next: MidiState) {
  state = next
  listeners.forEach((l) => l())
}

export function getMidiState(): MidiState {
  return state
}

export function subscribeMidi(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function midiUrl(hymnNumber: number): string {
  return `${import.meta.env.BASE_URL}midi/${String(hymnNumber).padStart(3, '0')}.mid`
}

async function ensureEngine(): Promise<Sequencer> {
  if (sequencer) return sequencer
  const { WorkletSynthesizer, Sequencer } = await import('spessasynth_lib')
  ctx = new AudioContext()
  await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}spessasynth_processor.min.js`)
  synth = new WorkletSynthesizer(ctx)
  synth.connect(ctx.destination)
  const sf = await fetch(`${import.meta.env.BASE_URL}sf/TimGM6mb.sf2`)
  if (!sf.ok) throw new Error(`Soundfont failed to load (${sf.status})`)
  await synth.soundBankManager.addSoundBank(await sf.arrayBuffer(), 'main')
  await synth.isReady
  sequencer = new Sequencer(synth, { skipToFirstNoteOn: true })
  return sequencer
}

// Flip back to idle shortly after the song runs out, so the button resets.
function watchForEnd() {
  if (endWatch !== null) window.clearInterval(endWatch)
  endWatch = window.setInterval(() => {
    if (!sequencer || state.status !== 'playing') return
    if (sequencer.duration > 0 && sequencer.currentTime >= sequencer.duration - 0.1) {
      sequencer.pause()
      setState({ status: 'idle', hymnNumber: null })
      if (endWatch !== null) window.clearInterval(endWatch)
      endWatch = null
    }
  }, 400)
}

export async function playHymn(hymnNumber: number): Promise<void> {
  // Resume if this hymn is just paused.
  if (state.hymnNumber === hymnNumber && state.status === 'paused' && sequencer) {
    sequencer.play()
    setState({ status: 'playing', hymnNumber })
    watchForEnd()
    return
  }
  setState({ status: 'loading', hymnNumber })
  try {
    const res = await fetch(midiUrl(hymnNumber))
    const buf = res.ok ? await res.arrayBuffer() : null
    // Guard against SPA-fallback HTML masquerading as a .mid
    const isMidi = buf && new TextDecoder().decode(buf.slice(0, 4)) === 'MThd'
    if (!buf || !isMidi) {
      setState({ status: 'unavailable', hymnNumber })
      return
    }
    const seq = await ensureEngine()
    await ctx!.resume()
    seq.loadNewSongList([{ binary: buf, fileName: `${hymnNumber}.mid` }])
    seq.loopCount = 0
    seq.play()
    setState({ status: 'playing', hymnNumber })
    watchForEnd()
  } catch {
    setState({ status: 'error', hymnNumber })
  }
}

export function pauseMidi(): void {
  if (!sequencer || state.status !== 'playing') return
  sequencer.pause()
  setState({ status: 'paused', hymnNumber: state.hymnNumber })
}

export function stopMidi(): void {
  sequencer?.pause()
  setState({ status: 'idle', hymnNumber: null })
}
