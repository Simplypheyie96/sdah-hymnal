import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Hymn, Verse } from '../data/hymns'
import { CastIcon, ChevronLeftIcon, ChevronRightIcon, PresentIcon } from './icons'
import { AudioButton } from './AudioButton'
import { recordingNumberFor } from './HymnView'
import { canCast, castHymn, type CastSession } from '../lib/present'
import { SecondScreen } from './SecondScreen'

function verseLabel(verses: Verse[], index: number) {
  if (verses[index].isRefrain) return 'Refrain'
  const n = verses.slice(0, index + 1).filter((v) => !v.isRefrain).length
  return `Verse ${n}`
}

// Fullscreen projection view for church screens: huge type, one verse at a
// time, arrow keys / clicks to advance. Dark stage so it reads from the pews.
export function Presenter({ hymn, onClose }: { hymn: Hymn; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [cast, setCast] = useState<CastSession | null>(null)
  const [castError, setCastError] = useState<string | null>(null)
  const [secondScreen, setSecondScreen] = useState(false)
  const verse = hymn.verses[index]

  // Hand the hymn to a television. The phone keeps the controls; the TV shows
  // only the words. Chrome and Edge can do this; Safari cannot, so there the
  // button is replaced by mirroring instructions.
  const startCast = async () => {
    setCastError(null)
    try {
      const session = await castHymn(hymn.songId, hymn.lang, () => setCast(null))
      session.showVerse(index)
      setCast(session)
    } catch (e) {
      // Dismissing the device picker is a cancel, not a failure.
      const msg = e instanceof Error ? e.message : String(e)
      if (!/cancel|abort|NotAllowed/i.test(msg)) {
        setCastError('No Chromecast found — use “Open on TV” for other televisions')
      }
    }
  }

  // Keep the television on the same verse as the phone.
  useEffect(() => {
    cast?.showVerse(index)
  }, [cast, index])

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(hymn.verses.length - 1, Math.max(0, i + delta)))
    },
    [hymn.verses.length],
  )

  // Hide the browser chrome, once, on open.
  //
  // Deliberately not keyed on `cast`: re-requesting fullscreen every time the
  // cast session changes resizes the viewport again, and a viewport resize can
  // flip the app's split-view breakpoint. Fullscreen is a nicety — the
  // presenter is already a fixed, full-bleed overlay — so every failure here
  // is swallowed and nothing downstream depends on it.
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Keep the screen awake while projecting — a phone mirrored to the family
  // TV must not sleep mid-hymn. Re-acquired when the tab becomes visible
  // again (browsers release wake locks on visibility change).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let released = false
    const acquire = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        /* unsupported or low battery — projection still works */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !released) void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') go(1)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [go, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[90] flex flex-col bg-[#0b0d0e] text-[#f4f5f4]"
      onClick={() => go(1)}
    >
      {/* Top strip. Everything here has to survive a narrow phone held
          upright: the title truncates rather than wrapping a word per line,
          and the controls fall back to icons when there is no room for
          labels. */}
      <div className="flex items-center gap-3 px-[4vw] pt-[max(env(safe-area-inset-top),14px)] text-[#7a8187]">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className="numeral shrink-0 text-[clamp(17px,1.8vw,26px)] text-[#c7ccd0]">
            {hymn.number}
          </span>
          <span className="font-lyrics truncate text-[clamp(14px,1.5vw,22px)]">
            {hymn.title}
          </span>
        </div>

        <span className="shrink-0 text-[clamp(11px,1.1vw,16px)] font-semibold uppercase tracking-[0.18em] tabular-nums">
          <span className="hidden md:inline">{verseLabel(hymn.verses, index)} · </span>
          {index + 1}/{hymn.verses.length}
        </span>

        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSecondScreen(true)}
            aria-label="Open this hymn on another screen"
            title="Open on a TV or second screen"
            className="flex h-10 items-center gap-2 rounded-full px-3 text-[14px] font-semibold text-[#c7ccd0] transition-colors hover:bg-white/10"
          >
            <PresentIcon size={19} />
            <span className="hidden sm:inline">Open on TV</span>
          </button>

          {canCast() && (
            <button
              onClick={() => (cast ? cast.stop() : void startCast())}
              aria-label={cast ? 'Stop casting' : 'Cast to a television'}
              title={cast ? 'Stop casting' : 'Cast to a Chromecast'}
              className={`flex h-10 items-center gap-2 rounded-full px-3 text-[14px] font-semibold transition-colors ${
                cast ? 'bg-white/90 text-[#0b0d0e]' : 'text-[#c7ccd0] hover:bg-white/10'
              }`}
            >
              <CastIcon size={19} />
              <span className="hidden sm:inline">{cast ? 'On TV' : 'Cast'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            aria-label="Exit presentation"
            title="Exit"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[18px] text-[#c7ccd0] transition-colors hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Verse */}
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-1 items-center justify-center px-[8vw] pb-16 text-center"
      >
        <p
          className={`font-lyrics leading-[1.5] text-[clamp(28px,4.2vw,64px)] ${
            verse.isRefrain ? 'italic' : ''
          }`}
        >
          {verse.lines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </p>
      </motion.div>

      {/* Bottom controls */}
      <div className="flex flex-col items-center gap-5 pb-8">
        <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Previous verse"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-[#c7ccd0] transition-colors hover:bg-white/15 disabled:opacity-25"
          >
            <ChevronLeftIcon />
          </button>
          <span className="w-24 text-center text-[13px] tracking-wide text-[#7a8187]">
            tap / arrows
          </span>
          {recordingNumberFor(hymn) !== undefined && (
            <AudioButton hymnNumber={recordingNumberFor(hymn)!} variant="stage" />
          )}
          <button
            onClick={() => go(1)}
            disabled={index === hymn.verses.length - 1}
            aria-label="Next verse"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-[#c7ccd0] transition-colors hover:bg-white/15 disabled:opacity-25"
          >
            <ChevronRightIcon />
          </button>
        </div>
        <p className="max-w-md px-8 text-center text-[12px] leading-relaxed tracking-wide text-[#565d63]">
          {castError
            ? castError
            : cast
              ? 'Showing on the television. This phone stays the remote — change verses here.'
              : canCast()
                ? 'Cast sends the words to a Chromecast or smart TV, and this phone becomes the remote.'
                : 'To put this on a TV, mirror your screen — iPhone: Control Centre → Screen Mirroring. AirPlay carries the music too.'}
        </p>
      </div>

      {secondScreen && (
        <div onClick={(e) => e.stopPropagation()}>
          <SecondScreen
            songId={hymn.songId}
            lang={hymn.lang}
            onDismiss={() => setSecondScreen(false)}
          />
        </div>
      )}
    </motion.div>
  )
}
