import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Hymn } from '../data/hymns'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const

/**
 * Phone-style keypad for jumping to a hymn by number — the way people
 * actually reach for a hymn in church. Shows the matching title live so you
 * know you have the right one before you open it.
 */
export function NumberPad({
  hymns,
  hymnalTitle,
  onOpen,
  onDismiss,
}: {
  hymns: Hymn[]
  hymnalTitle: string
  onOpen: (songId: string) => void
  onDismiss: () => void
}) {
  const [value, setValue] = useState('')
  const match = value ? hymns.find((h) => h.number === Number(value)) : undefined

  const press = (key: (typeof KEYS)[number]) => {
    if (navigator.vibrate) navigator.vibrate(8)
    if (key === 'clear') return setValue('')
    if (key === 'back') return setValue((v) => v.slice(0, -1))
    setValue((v) => (v.length >= 3 ? v : v + key))
  }

  const go = () => {
    if (!match) return
    onOpen(match.songId)
    onDismiss()
  }

  // Hardware keyboards should drive this too — iPads, and anyone on desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number])
      else if (e.key === 'Backspace') press('back')
      else if (e.key === 'Enter') go()
      else if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Go to hymn number"
    >
      <motion.div
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 70, opacity: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="glass hairline w-full max-w-sm rounded-t-[30px] px-6 pb-[max(env(safe-area-inset-bottom),22px)] pt-5 shadow-[var(--shadow-float)] sm:rounded-[30px] sm:pb-6"
      >
        {/* Readout */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-[var(--ink-3)]">{hymnalTitle}</p>
            <div
              aria-live="polite"
              className="numeral mt-1 text-[52px] leading-none text-[var(--accent-ink)]"
            >
              {value || <span className="opacity-25">—</span>}
            </div>
            <p className="mt-2 min-h-[20px] truncate text-[14px] text-[var(--ink-2)]">
              {match ? match.title : value ? 'No hymn with that number' : 'Enter a number'}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)]"
          >
            Close
          </button>
        </div>

        {/* Keys */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {KEYS.map((key) => {
            const isDigit = /^\d$/.test(key)
            return (
              <button
                key={key}
                onClick={() => press(key)}
                aria-label={
                  key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear' : key
                }
                className={`hairline flex h-14 items-center justify-center rounded-2xl transition-all duration-150 active:scale-[0.96] ${
                  isDigit
                    ? 'numeral bg-[var(--paper-raised)] text-[26px] text-[var(--ink)] hover:bg-[var(--accent)]/10'
                    : 'text-[13px] font-semibold text-[var(--ink-2)] hover:text-[var(--ink)]'
                }`}
              >
                {key === 'back' ? '⌫' : key === 'clear' ? 'Clear' : key}
              </button>
            )
          })}
        </div>

        <button
          onClick={go}
          disabled={!match}
          className="mt-3 w-full rounded-2xl bg-[var(--accent)] px-5 py-4 text-[15px] font-semibold text-[var(--accent-contrast)] transition-opacity duration-200 disabled:opacity-25"
        >
          {match ? `Open ${match.number}` : 'Open hymn'}
        </button>
      </motion.div>
    </motion.div>
  )
}
