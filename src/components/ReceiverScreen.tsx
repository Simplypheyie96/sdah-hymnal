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

  const hymn = ready ? (resolve(songId, lang) ?? resolve(songId, 'en')) : undefined
  const verse = hymn?.verses[Math.min(index, (hymn?.verses.length ?? 1) - 1)]

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0b0d0e] text-[#f4f5f4]">
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

      <div className="flex flex-1 items-center justify-center px-[7vw] pb-[4vh] text-center">
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
    </div>
  )
}
