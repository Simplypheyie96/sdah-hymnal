import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LANGS, canShowText, type Hymn, type LangCode } from '../data/hymns'
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
  pendingLang?: LangCode
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
  pendingLang,
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
  const pendingLabel = pendingLang && LANGS.find((l) => l.code === pendingLang)

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
      {/* Top chrome */}
      <div className="glass sticky top-0 z-10 border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          {onClose ? (
            <button
              onClick={onClose}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)] hover:text-[var(--ink)]"
            >
              <ChevronLeftIcon />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPresentOpen(true)}
              aria-label="Present on screen"
              title="Project this hymn for the congregation"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)] hover:text-[var(--ink)]"
            >
              <PresentIcon />
            </button>
            <button
              onClick={() => setShareOpen(true)}
              aria-label="Share"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)] hover:text-[var(--ink)]"
            >
              <ShareIcon />
            </button>
            <button
              onClick={onToggleFavorite}
              aria-label="Favorite"
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:bg-[var(--paper-raised)] ${
                isFavorite ? 'text-[var(--ink)]' : 'text-[var(--ink-2)]'
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
        className="mx-auto w-full max-w-2xl px-7 pb-16"
      >
        <header className="pt-12 pb-10 text-center">
          <div className="font-lyrics text-[92px] font-[200] leading-none tracking-[-0.03em] text-[var(--ink)]">
            {hymn.number}
          </div>
          <h1 className="font-lyrics mx-auto mt-4 max-w-md text-[26px] font-[450] leading-snug tracking-[-0.01em]">
            {hymn.title}
          </h1>
          {hymn.author && (
            <p className="mt-3 text-[12.5px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
              {hymn.author}
            </p>
          )}
          <div className="mx-auto mt-8 h-px w-16 bg-[var(--line-strong)]" />

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
        </header>

        {pendingLabel && (
          <div className="hairline mb-10 rounded-3xl bg-[var(--paper-raised)] px-8 py-6 text-center">
            <p className="font-lyrics text-[17px] text-[var(--ink-2)]">
              Not yet in {pendingLabel.hymnalTitle}
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-[var(--ink-3)]">
              This song isn’t mapped to the {pendingLabel.label} hymnal yet — showing the
              English text meanwhile.
            </p>
          </div>
        )}
        {!canShowText(hymn) ? (
          <div className="hairline rounded-3xl bg-[var(--paper-raised)] px-8 py-10 text-center">
            <p className="font-lyrics text-[19px] leading-relaxed text-[var(--ink-2)]">
              This text is under copyright.
            </p>
            <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-[var(--ink-3)]">
              We show the full words of every hymn we have the rights to. This one arrives as
              soon as our licensing agreement with the publishers is complete — the number,
              title, and tune are here so you can still follow along in the printed hymnal.
            </p>
            {hymn.author && (
              <p className="mt-5 text-[12px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
                {hymn.author}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {/* verses always render — English fallback when the edition lacks this song */}
            {hymn.verses.map((verse, i) => {
              const verseNumber = hymn.verses.slice(0, i + 1).filter((v) => !v.isRefrain).length
              return (
                <div key={i} className={verse.isRefrain ? 'pl-6' : ''}>
                  <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">
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
        )}
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
