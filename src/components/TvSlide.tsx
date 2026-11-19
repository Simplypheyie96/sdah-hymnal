import { useEffect, useRef, useState } from 'react'
import { useFitText } from '../lib/fit'
import type { Slide } from '../lib/tv'

declare global {
  interface Window {
    __tvSlide?: Slide
  }
}

/**
 * What the TV shows while the store app on iPhone is connected to it.
 * The app loads this page (?tv) on the external screen and pushes each verse
 * into it (window.__tvSlide + a 'tvslide' event). No controls: the phone is
 * the remote. Between hymns it rests on the hymnal's name.
 */
export function TvSlide() {
  const [slide, setSlide] = useState<Slide>(window.__tvSlide ?? null)
  const box = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLParagraphElement>(null)
  useFitText(box, text, slide)

  useEffect(() => {
    const on = () => setSlide(window.__tvSlide ?? null)
    window.addEventListener('tvslide', on)
    on()
    return () => window.removeEventListener('tvslide', on)
  }, [])

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#0b0d0e] text-[#f4f5f4]">
      {slide ? (
        <>
          <div className="flex items-baseline justify-between gap-8 px-[5vw] pt-[4vh] text-[#7a8187]">
            <span className="font-lyrics truncate text-[2.4vw]">
              {slide.number} · {slide.title}
            </span>
            <span className="shrink-0 text-[1.5vw] font-semibold uppercase tracking-[0.2em] tabular-nums">
              {slide.label} · {slide.position}
            </span>
          </div>
          <div ref={box} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-[8vw] pt-[5vh] pb-[7vh] text-center">
            <p
              ref={text}
              className={`font-lyrics leading-[1.4] text-[4.6vw] ${slide.refrain ? 'italic' : ''} ${slide.response ? 'font-semibold' : ''}`}
            >
              {slide.lines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-[2vh]">
          <span className="text-[1.4vw] font-semibold uppercase tracking-[0.3em] text-[#7a8187]">
            Seventh-day Adventist
          </span>
          <span className="font-lyrics text-[7vw] leading-none">Hymnal</span>
        </div>
      )}
    </div>
  )
}
