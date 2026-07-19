import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LANGS, type Hymn, type LangCode } from '../data/hymns'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  PresentIcon,
  ShareIcon,
} from './icons'
import { MidiButton } from './MidiButton'
import { ShareSheet } from './ShareSheet'
import { Presenter } from './Presenter'

/** SDAH number whose MIDI accompanies this entry (tunes are shared across editions). */
export function midiNumberFor(hymn: Hymn): number | undefined {
  if (hymn.kind !== 'hymn') return undefined
  return hymn.lang === 'en' ? hymn.number : hymn.sdahRef
}

export type HymnContentProps = {
  hymn: Hymn
  lang: LangCode
  onLang: (l: LangCode) => void
  /** Edition the user asked for that has no counterpart for this song. */
  unavailableIn?: LangCode
  fontScale: number
  isFavorite: boolean
  onToggleFavorite: () => void
  onNavigate: (songId: string) => void
  prev?: string
  next?: string
  onClose?: () => void
  inline?: boolean
}

export function HymnContent({
  hymn,
  lang,
  onLang,
  unavailableIn,
  fontScale,
  isFavorite,
  onToggleFavorite,
  onNavigate,
  prev,
  next,
  onClose,
}: HymnContentProps) {
  const [shareOpen, setShareOpen] = useState(false)
  const [presentOpen, setPresentOpen] = useState(false)
  const missingFrom = unavailableIn ? LANGS.find((l) => l.code === unavailableIn) : undefined

  // Arrow keys page between hymns — handy on iPad keyboards and desktop.
  // Paused while presenting, so the presenter owns the arrows.
  useEffect(() => {
    if (presentOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prev) onNavigate(prev)
      if (e.key === 'ArrowRight' && next) onNavigate(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onNavigate, presentOpen])

  return (
    <>
      {/* Floating chrome — two detached glass clusters so the page reads as
          one continuous sheet of paper running underneath them. */}
      <div className="sticky top-0 z-30 px-4 pt-[max(env(safe-area-inset-top),12px)] pointer-events-none">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          {onClose ? (
            <button
              onClick={onClose}
              aria-label="Back"
              className="glass hairline pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--ink-2)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:text-[var(--ink)] active:scale-95"
            >
              <ChevronLeftIcon />
            </button>
          ) : (
            <div className="h-11 w-11 shrink-0" />
          )}

          <div className="glass hairline pointer-events-auto flex items-center gap-0.5 rounded-full p-1 shadow-[var(--shadow-soft)]">
            <button
              onClick={() => setPresentOpen(true)}
              aria-label="Present on screen"
              title="Project this hymn for the congregation"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--accent)]/12 hover:text-[var(--accent-ink)]"
            >
              <PresentIcon />
            </button>
            <button
              onClick={() => setShareOpen(true)}
              aria-label="Share"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--accent)]/12 hover:text-[var(--accent-ink)]"
            >
              <ShareIcon />
            </button>
            <button
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={isFavorite}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:bg-[var(--accent)]/12 ${
                isFavorite ? 'text-[var(--accent-ink)]' : 'text-[var(--ink-2)]'
              }`}
            >
              <HeartIcon filled={isFavorite} />
            </button>
          </div>
        </div>
      </div>

      {/* Hymn body */}
      <motion.article
        key={`${hymn.songId}-${hymn.lang}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto -mt-[60px] w-full max-w-2xl px-7 pb-16"
      >
        <header className="pt-[104px] pb-10 text-center">
          <div className="numeral text-[92px] leading-none text-[var(--accent-ink)]">
            {hymn.number}
          </div>
          <h1 className="display-title mx-auto mt-4 max-w-md text-[26px] leading-snug text-[var(--accent-ink)]">
            {hymn.title}
          </h1>
          {hymn.author && (
            <p className="mt-3 text-[12.5px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
              {hymn.author}
            </p>
          )}
          <div className="mx-auto mt-8 h-px w-16 bg-[var(--accent)] opacity-30" />

          {/* Language switch lives with the hymn, where it has room to breathe */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => l.available && onLang(l.code)}
                disabled={!l.available}
                title={l.available ? l.hymnalTitle : `${l.hymnalTitle} — coming soon`}
                className={`hairline rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all duration-250 ${
                  lang === l.code
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : l.available
                      ? 'glass text-[var(--ink-2)] hover:text-[var(--ink)]'
                      : 'cursor-not-allowed text-[var(--ink-3)] opacity-40'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Say plainly which hymnal lacks this song, rather than silently
              showing the other language's words as if they were a match. */}
          {missingFrom && (
            <p
              role="status"
              className="mx-auto mt-5 max-w-xs text-[12.5px] leading-relaxed text-[var(--ink-3)]"
            >
              Not in {missingFrom.hymnalTitle} — showing the{' '}
              {LANGS.find((l) => l.code === hymn.lang)?.label} words.
            </p>
          )}
        </header>

        <div className="space-y-10">
          {hymn.verses.map((verse, i) => {
            const verseNumber = hymn.verses.slice(0, i + 1).filter((v) => !v.isRefrain).length
            return (
              <div
                key={i}
                className={
                  verse.isRefrain
                    ? 'border-l-2 border-[var(--accent)]/35 pl-5 sm:pl-6'
                    : ''
                }
              >
                <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-ink)] opacity-70">
                  {verse.isRefrain
                    ? 'Refrain'
                    : hymn.kind === 'reading'
                      ? `Part ${verseNumber}`
                      : `Verse ${verseNumber}`}
                </div>
                <p
                  className={`font-lyrics leading-[1.75] text-[var(--ink)] ${verse.isRefrain ? 'italic' : ''}`}
                  style={{ fontSize: `${19 * fontScale}px` }}
                >
                  {verse.lines.map((line, j) => (
                    <span key={j} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            )
          })}
        </div>
      </motion.article>

      {/* Floating controls: previous / next hymn + future MIDI player */}
      <div className="sticky bottom-0 z-20 mt-auto flex justify-center pb-[max(env(safe-area-inset-bottom),20px)] pt-3 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="glass hairline flex items-center rounded-full px-1.5 py-1.5 shadow-[var(--shadow-float)]">
            <button
              onClick={() => prev && onNavigate(prev)}
              disabled={!prev}
              aria-label="Previous hymn"
              className="flex h-10 w-12 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <span className="font-lyrics w-16 text-center text-[15px] font-[350] tabular-nums text-[var(--ink-2)]">
              {hymn.number}
            </span>
            <button
              onClick={() => next && onNavigate(next)}
              disabled={!next}
              aria-label="Next hymn"
              className="flex h-10 w-12 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRightIcon size={20} />
            </button>
          </div>

          {midiNumberFor(hymn) !== undefined && <MidiButton hymnNumber={midiNumberFor(hymn)!} />}
        </div>
      </div>

      <AnimatePresence>
        {shareOpen && <ShareSheet hymn={hymn} onDismiss={() => setShareOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {presentOpen && <Presenter hymn={hymn} onClose={() => setPresentOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

export function HymnOverlay(props: HymnContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[var(--paper)]"
    >
      <HymnContent {...props} />
    </motion.div>
  )
}
