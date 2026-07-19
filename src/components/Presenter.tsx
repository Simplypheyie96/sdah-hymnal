import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Hymn, Verse } from '../data/hymns'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import { AudioButton } from './AudioButton'
import { recordingNumberFor } from './HymnView'

function verseLabel(verses: Verse[], index: number) {
  if (verses[index].isRefrain) return 'Refrain'
  const n = verses.slice(0, index + 1).filter((v) => !v.isRefrain).length
  return `Verse ${n}`
}

// Fullscreen projection view for church screens: huge type, one verse at a
// time, arrow keys / clicks to advance. Dark stage so it reads from the pews.
export function Presenter({ hymn, onClose }: { hymn: Hymn; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const verse = hymn.verses[index]

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(hymn.verses.length - 1, Math.max(0, i + delta)))
    },
    [hymn.verses.length],
  )

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
      {/* Top strip */}
      <div className="flex items-center justify-between px-8 pt-6 text-[#7a8187]">
        <span className="font-lyrics text-[clamp(16px,1.6vw,24px)]">
          {hymn.number} · {hymn.title}
        </span>
        <div className="flex items-center gap-5">
          <span className="text-[clamp(13px,1.2vw,18px)] font-semibold uppercase tracking-[0.2em]">
            {verseLabel(hymn.verses, index)} · {index + 1}/{hymn.verses.length}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            aria-label="Exit presentation"
            className="rounded-full px-4 py-1.5 text-[14px] font-semibold text-[#c7ccd0] transition-colors hover:bg-white/10"
          >
            Exit ✕
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
        <p className="px-8 text-center text-[12px] leading-relaxed tracking-wide text-[#565d63]">
          At home: mirror this phone to your TV (AirPlay / Cast / HDMI) — the music plays
          through the TV with it.
        </p>
      </div>
    </motion.div>
  )
}
