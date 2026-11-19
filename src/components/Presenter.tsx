import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Hymn, Verse } from '../data/hymns'
import { ChevronLeftIcon, ChevronRightIcon, PresentIcon } from './icons'
import { AudioButton } from './AudioButton'
import { recordingNumberFor } from './HymnView'
import { SecondScreen } from './SecondScreen'
import { storeApp } from '../lib/native'
import { useFitText } from '../lib/fit'
import { showOnTv, watchTv } from '../lib/tv'

function verseLabel(verses: Verse[], index: number) {
  if (verses[index].isRefrain) return 'Refrain'
  const n = verses.slice(0, index + 1).filter((v) => !v.isRefrain).length
  return `Verse ${n}`
}

// Fullscreen projection view for church screens: huge type, one verse at a
// time, arrow keys / clicks to advance. Dark stage so it reads from the pews.
export function Presenter({ hymn, onClose }: { hymn: Hymn; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [secondScreen, setSecondScreen] = useState(false)
  const verse = hymn.verses[index]
  const [tvOn, setTvOn] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLParagraphElement>(null)
  useFitText(box, text, `${hymn.songId}:${index}`)

  // Store app on iPhone connected to a TV: the TV shows its own slide (TvSlide)
  // and this screen is the remote. Back to the resting screen on close.
  useEffect(() => watchTv(setTvOn), [])
  useEffect(() => {
    if (!tvOn) return
    showOnTv({
      number: hymn.number,
      title: hymn.title,
      label: verseLabel(hymn.verses, index),
      lines: verse.lines,
      refrain: verse.isRefrain,
      position: `${index + 1}/${hymn.verses.length}`,
    })
  }, [tvOn, hymn, index, verse])
  useEffect(() => () => showOnTv(null), [])

  // Paint the page behind the presenter dark too, so Safari's side strips in
  // landscape (and a mirrored TV) show black, not the light page.
  useEffect(() => {
    const root = document.documentElement
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')]
    const before = { bg: root.style.backgroundColor, body: document.body.style.backgroundColor, theme: metas.map((m) => m.getAttribute('content')) }
    root.style.backgroundColor = document.body.style.backgroundColor = '#0b0d0e'
    metas.forEach((m) => m.setAttribute('content', '#0b0d0e'))
    return () => {
      root.style.backgroundColor = before.bg
      document.body.style.backgroundColor = before.body
      metas.forEach((m, i) => m.setAttribute('content', before.theme[i] ?? ''))
    }
  }, [])

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
  //
  // Never in the store apps: there is no browser chrome to hide, and on iOS
  // WebKit's fullscreen window clashes with the app's view controllers and
  // UIKit aborts the whole app (WKFullScreenWindowController, SIGABRT).
  useEffect(() => {
    if (storeApp) return
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
      <div className={`flex items-center gap-3 px-[4vw] pt-[max(env(safe-area-inset-top),14px)] text-[#7a8187] ${storeApp ? 'pr-[calc(4vw+var(--cw))]' : ''}`}>
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
        ref={box}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-[8vw] py-4 text-center"
      >
        <p
          ref={text}
          className={`font-lyrics leading-[1.5] text-[clamp(28px,4.2vw,64px)] [@media(max-height:500px)]:!leading-[1.3] ${
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
      <div className="flex flex-col items-center gap-5 pb-[max(env(safe-area-inset-bottom),20px)] [@media(max-height:500px)]:pb-3">
        <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Previous verse"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-[#c7ccd0] transition-colors hover:bg-white/15 disabled:opacity-25"
          >
            <ChevronLeftIcon />
          </button>
          <span className="hidden w-24 text-center text-[13px] tracking-wide text-[#7a8187] sm:block">
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
        {tvOn ? (
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7a8187] [@media(max-height:500px)]:hidden">
            Showing on the TV
          </p>
        ) : (
          <p className="max-w-md px-8 text-center text-[12px] leading-relaxed tracking-wide text-[#7a8187] [@media(max-height:500px)]:hidden">
            To put this on a TV or projector, mirror your screen — or use “Open on TV”
            for a link you can open on the screen itself.
          </p>
        )}
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
