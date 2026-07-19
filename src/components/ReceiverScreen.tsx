import { useEffect, useState } from 'react'
import { useHymnal } from '../data/hymnal'
import type { LangCode, Verse } from '../data/hymns'
import { onControllerMessage } from '../lib/present'

function verseLabel(verses: Verse[], index: number) {
  const v = verses[index]
  if (!v) return ''
  if (v.isRefrain) return 'Refrain'
  if (v.isResponse) return 'Congregation'
  return `Verse ${verses.slice(0, index + 1).filter((x) => !x.isRefrain && !x.isResponse).length}`
}

/**
 * What the television shows when a phone casts to it.
 *
 * Deliberately its own screen rather than the app in disguise: no chrome, no
 * navigation, type sized for the back of a hall, and it follows whatever the
 * phone sends. If the connection drops the last verse simply stays up, which
 * is the right failure for a congregation mid-hymn.
 */
export function ReceiverScreen({ songId, lang }: { songId: string; lang: LangCode }) {
  const { ready, resolve, ensure } = useHymnal()
  const [index, setIndex] = useState(0)

  useEffect(() => ensure(lang), [ensure, lang])

  useEffect(
    () =>
      onControllerMessage((msg) => {
        if (msg.type === 'verse' && typeof msg.index === 'number') setIndex(msg.index)
      }),
    [],
  )

  // Opened directly on a TV or laptop rather than cast to, this page has no
  // controller — so it takes its own arrows, remote and clicks.
  const total = ready ? (resolve(songId, lang) ?? resolve(songId, 'en'))?.verses.length ?? 1 : 1
  useEffect(() => {
    const step = (d: number) => setIndex((i) => Math.min(total - 1, Math.max(0, i + d)))
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', ' ', 'Enter', 'PageDown'].includes(e.key)) step(1)
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  const hymn = ready ? (resolve(songId, lang) ?? resolve(songId, 'en')) : undefined
  const verse = hymn?.verses[Math.min(index, (hymn?.verses.length ?? 1) - 1)]

  return (
    <div
      className="fixed inset-0 flex cursor-pointer flex-col bg-[#0b0d0e] text-[#f4f5f4]"
      onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
    >
      <div className="flex items-baseline justify-between px-[4vw] pt-[3vh] text-[#7a8187]">
        <span className="font-lyrics text-[clamp(18px,2vw,34px)]">
          {hymn ? `${hymn.number} · ${hymn.title}` : 'Connecting…'}
        </span>
        {hymn && (
          <span className="text-[clamp(14px,1.4vw,22px)] font-semibold uppercase tracking-[0.2em]">
            {verseLabel(hymn.verses, index)}
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center px-[7vw] pb-[2vh] text-center">
        {verse ? (
          <p
            className={`font-lyrics leading-[1.45] text-[clamp(32px,5vw,86px)] ${
              verse.isRefrain ? 'italic' : ''
            } ${verse.isResponse ? 'font-semibold' : ''}`}
          >
            {verse.lines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
        ) : (
          <p className="font-lyrics text-[clamp(20px,2.4vw,40px)] text-[#565d63]">
            Waiting for the hymn…
          </p>
        )}
      </div>

      {hymn && hymn.verses.length > 1 && (
        <p className="pb-[3vh] text-center text-[clamp(11px,1.1vw,16px)] tracking-wide text-[#3f464b]">
          {index + 1} of {hymn.verses.length} · tap or press → for the next verse
        </p>
      )}
    </div>
  )
}
