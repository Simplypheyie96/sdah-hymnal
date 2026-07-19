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
  /** Which verse the accompaniment is on, 1-based (0 when idle). */
  verse: number
  /** How many times the tune will be played through in total. */
  verseCount: number
}

let ctx: AudioContext | null = null
let synth: WorkletSynthesizer | null = null
let sequencer: Sequencer | null = null
let endWatch: number | null = null

let state: MidiState = { status: 'idle', hymnNumber: null, verse: 0, verseCount: 0 }

// A hymn MIDI holds the tune once, because every verse is sung to the same
// music. Playing it once and stopping leaves the congregation stranded after
// verse 1, so we replay it until the verses run out.
let versesLeft = 0
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
function stopWatch() {
  if (endWatch !== null) window.clearInterval(endWatch)
  endWatch = null
}

// At the end of each pass, start the tune again for the next verse — or stop
// once every verse has been played.
function watchForEnd() {
  stopWatch()
  endWatch = window.setInterval(() => {
    if (!sequencer || state.status !== 'playing') return
    if (sequencer.duration > 0 && sequencer.currentTime >= sequencer.duration - 0.1) {
      versesLeft -= 1
      if (versesLeft > 0) {
        sequencer.currentTime = 0
        sequencer.play()
        setState({ ...state, verse: state.verseCount - versesLeft + 1 })
        return
      }
      sequencer.pause()
      setState({ status: 'idle', hymnNumber: null, verse: 0, verseCount: 0 })
      stopWatch()
    }
  }, 250)
}

/**
 * Play a hymn's accompaniment.
 *
 * @param verseCount how many verses the congregation will sing. The tune is
 *   replayed once per verse, so the music lasts as long as the words do.
 */
export async function playHymn(hymnNumber: number, verseCount = 1): Promise<void> {
  const total = Math.max(1, verseCount)

  // Resume if this hymn is just paused.
  if (state.hymnNumber === hymnNumber && state.status === 'paused' && sequencer) {
    sequencer.play()
    setState({ ...state, status: 'playing' })
    watchForEnd()
    return
  }
  setState({ status: 'loading', hymnNumber, verse: 0, verseCount: total })
  try {
    const res = await fetch(midiUrl(hymnNumber))
    const buf = res.ok ? await res.arrayBuffer() : null
    // Guard against SPA-fallback HTML masquerading as a .mid
    const isMidi = buf && new TextDecoder().decode(buf.slice(0, 4)) === 'MThd'
    if (!buf || !isMidi) {
      setState({ status: 'unavailable', hymnNumber, verse: 0, verseCount: 0 })
      return
    }
    const seq = await ensureEngine()
    await ctx!.resume()
    seq.loadNewSongList([{ binary: buf, fileName: `${hymnNumber}.mid` }])
    seq.loopCount = 0 // repeats are counted here, not by the sequencer
    seq.play()
    versesLeft = total
    setState({ status: 'playing', hymnNumber, verse: 1, verseCount: total })
    watchForEnd()
  } catch {
    setState({ status: 'error', hymnNumber, verse: 0, verseCount: 0 })
  }
}

export function pauseMidi(): void {
  if (!sequencer || state.status !== 'playing') return
  sequencer.pause()
  setState({ ...state, status: 'paused' })
}

export function stopMidi(): void {
  sequencer?.pause()
  versesLeft = 0
  stopWatch()
  setState({ status: 'idle', hymnNumber: null, verse: 0, verseCount: 0 })
}
