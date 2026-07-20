import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Hymn, Verse } from '../data/hymns'

// Where to get the app, printed on every shared card. Change this one line
// when a real domain replaces the Vercel address.
const APP_URL = 'sdahymnal.vercel.app'

const W = 1080
const H = 1350

// Card palettes: a soft gradient field, a deep ink for the display type, and
// one warm accent that colors the closing line and the category pill.
type PaletteId = 'mono' | 'sage' | 'rose' | 'sky'

type Palette = {
  id: PaletteId
  label: string
  bgTop: string
  bgBottom: string
  ink: string
  accent: string
  muted: string
}

// Each palette pairs its own field with an accent drawn from a different
// part of the wheel, so the four cards never read as variations on one idea.
const PALETTES: Palette[] = [
  // Warm paper, graphite ink, quiet slate accent.
  { id: 'mono', label: 'Paper', bgTop: '#f5f4f2', bgBottom: '#e8e7e4', ink: '#1a1c1e', accent: '#5c6469', muted: '#8b9195' },
  // Blush field, oxblood ink, deep rose accent.
  { id: 'rose', label: 'Rose', bgTop: '#f9e6e3', bgBottom: '#f2d3d0', ink: '#3f1f21', accent: '#a83b52', muted: '#a87f80' },
  // Sage field, forest ink, olive-gold accent — the one warm pairing.
  { id: 'sage', label: 'Sage', bgTop: '#e8efe3', bgBottom: '#d6e4d2', ink: '#1f3a24', accent: '#7d8f3a', muted: '#748a70' },
  // Cool blue field, navy ink, and a genuinely blue accent.
  { id: 'sky', label: 'Sky', bgTop: '#e2eaf5', bgBottom: '#cfdcee', ink: '#172b47', accent: '#2f6fb0', muted: '#7488a6' },
]

function verseLabel(verses: Verse[], index: number) {
  if (verses[index].isRefrain) return 'Refrain'
  const n = verses.slice(0, index + 1).filter((v) => !v.isRefrain).length
  return `Verse ${n}`
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(' ')
  const out: string[] = []
  let line = ''
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word
    if (ctx.measureText(attempt).width > maxWidth && line) {
      out.push(line)
      line = word
    } else {
      line = attempt
    }
  }
  if (line) out.push(line)
  return out
}

async function drawCard(hymn: Hymn, verseIndex: number, paletteId: PaletteId, dark: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H // the default; a verse too long for it grows the card below
  const ctx = canvas.getContext('2d')!

  await Promise.all([
    document.fonts.load('400 132px "Bodoni Moda"'),
    document.fonts.load('600 54px "EB Garamond"'),
    document.fonts.load('500 78px "EB Garamond"'),
    document.fonts.load('italic 500 78px "EB Garamond"'),
  ]).catch(() => {})

  const p = PALETTES.find((x) => x.id === paletteId)!
  const mono = paletteId === 'mono'
  const bgTop = mono && dark ? '#14161a' : p.bgTop
  const bgBottom = mono && dark ? '#0e1013' : p.bgBottom
  const ink = mono && dark ? '#eef0f1' : p.ink
  const accent = mono && dark ? '#9aa1a6' : p.accent
  const muted = mono && dark ? '#71787d' : p.muted

  // ——— Measure before painting, so the card can grow for a verse that would
  // otherwise run off the bottom. The lyrics are never cropped; a long reading
  // (some are 40+ lines) simply produces a taller card, footer and all.

  // Title block — its height sets where the verse begins.
  ctx.font = '600 54px "EB Garamond", Georgia, serif'
  const titleLines = wrapLines(ctx, hymn.title, 880)
  const titleEnd = 336 + titleLines.length * 64
  const top = titleEnd + 62

  // Auto-fit the verse to the standard card, down to a floor that survives the
  // compression social apps apply. If it still overflows at the floor, keep the
  // floor size and grow the card rather than letting it collide with the footer.
  const verse = hymn.verses[verseIndex]
  const italic = verse.isRefrain ? 'italic ' : ''
  const FLOOR = 34
  const standardRoom = H - 214 - top // 214: room for the wordmark and link beneath
  let fontSize = 78
  for (; fontSize > FLOOR; fontSize -= 2) {
    ctx.font = `${italic}500 ${fontSize}px "EB Garamond", Georgia, serif`
    const test = verse.lines.flatMap((l) => wrapLines(ctx, l, 900))
    if (test.length * fontSize * 1.42 <= standardRoom) break
  }
  ctx.font = `${italic}500 ${fontSize}px "EB Garamond", Georgia, serif`
  const lines = verse.lines.flatMap((l) => wrapLines(ctx, l, 900))
  const lineHeight = fontSize * 1.42
  const verseHeight = lines.length * lineHeight

  // Grow only when needed — a normal hymn keeps the standard 4:5 card.
  const cardH = verseHeight <= standardRoom ? H : Math.ceil(top + verseHeight + 214)
  if (cardH !== canvas.height) canvas.height = cardH // resizing clears the ctx state
  const room = cardH - 214 - top

  // ——— Paint, at the settled height ———
  ctx.textAlign = 'center'

  // Soft gradient field
  const grad = ctx.createLinearGradient(0, 0, 0, cardH)
  grad.addColorStop(0, bgTop)
  grad.addColorStop(1, bgBottom)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, cardH)

  // Paper grain, tinted with the ink tone — density held as the card grows.
  // The tint is set once; per-dot opacity comes from globalAlpha (a number), so
  // the grain stays varied without building an rgba() string tens of thousands
  // of times per card.
  const [ir, ig, ib] = [
    parseInt(ink.slice(1, 3), 16),
    parseInt(ink.slice(3, 5), 16),
    parseInt(ink.slice(5, 7), 16),
  ]
  const grainScale = cardH / H
  ctx.fillStyle = `rgb(${ir},${ig},${ib})`
  for (let i = 0; i < 26000 * grainScale; i++) {
    ctx.globalAlpha = Math.random() * 0.05
    ctx.fillRect(Math.random() * W, Math.random() * cardH, 1.5, 1.5)
  }
  for (let i = 0; i < 120 * grainScale; i++) {
    ctx.globalAlpha = 0.08 + Math.random() * 0.1
    const s = 1.5 + Math.random() * 2.5
    ctx.fillRect(Math.random() * W, Math.random() * cardH, s, s)
  }
  ctx.globalAlpha = 1 // reset so the type below paints fully opaque

  // The card is composed like a hymnal title page: a struck numeral, the
  // title beneath it, then the verse set as reading text. Lyrics keep their
  // original case — uppercasing mangles Yorùbá and Igbo diacritics.

  // Eyebrow
  ctx.fillStyle = muted
  ctx.font = '600 24px -apple-system, system-ui, sans-serif'
  ctx.fillText('S E V E N T H - D A Y   A D V E N T I S T   H Y M N A L', W / 2, 122)

  // Numeral — a mark on the page, not the subject. The verse is the point.
  ctx.fillStyle = accent
  ctx.font = '400 132px "Bodoni Moda", Didot, Georgia, serif'
  ctx.fillText(String(hymn.number), W / 2, 262)

  // Title
  ctx.fillStyle = ink
  ctx.font = '600 54px "EB Garamond", Georgia, serif'
  let ty = 336
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, ty)
    ty += 64
  }

  // Hairline rule under the title block
  ctx.strokeStyle = accent
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(W / 2 - 56, ty + 2)
  ctx.lineTo(W / 2 + 56, ty + 2)
  ctx.stroke()
  ctx.globalAlpha = 1

  // Verse — the hero, centered in the room it has (which it fills on a grown card).
  const blockTop = top + Math.max(0, (room - verseHeight) / 2)
  ctx.font = `${italic}500 ${fontSize}px "EB Garamond", Georgia, serif`
  ctx.fillStyle = ink
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, blockTop + (i + 1) * lineHeight)
  })

  // Footer: verse label, the wordmark, then where to get the app — a shared
  // card is the main way people will hear about it, so it has to carry a way
  // back. APP_URL is the one line to change when a real domain is in place.
  ctx.fillStyle = muted
  ctx.font = '600 25px -apple-system, system-ui, sans-serif'
  ctx.fillText(verseLabel(hymn.verses, verseIndex).toUpperCase(), W / 2, cardH - 172)

  ctx.fillStyle = accent
  ctx.font = '500 40px "EB Garamond", Georgia, serif'
  ctx.fillText('Hymnal', W / 2, cardH - 116)

  ctx.fillStyle = muted
  ctx.font = '500 26px -apple-system, system-ui, sans-serif'
  ctx.fillText(APP_URL, W / 2, cardH - 70)

  return canvas
}

export function ShareSheet({ hymn, onDismiss }: { hymn: Hymn; onDismiss: () => void }) {
  const [verseIndex, setVerseIndex] = useState(0)
  const [paletteId, setPaletteId] = useState<PaletteId>('mono')
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dark = document.documentElement.classList.contains('dark')

  const regenerate = useCallback(async () => {
    const canvas = await drawCard(hymn, verseIndex, paletteId, dark)
    canvasRef.current = canvas
    setImgUrl(canvas.toDataURL('image/png'))
  }, [hymn, verseIndex, paletteId, dark])

  useEffect(() => {
    regenerate()
  }, [regenerate])

  const shareImage = async () => {
    if (!canvasRef.current) return
    setBusy(true)
    try {
      const blob = await new Promise<Blob | null>((res) =>
        canvasRef.current!.toBlob(res, 'image/png'),
      )
      if (!blob) return
      const file = new File([blob], `hymn-${hymn.number}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: hymn.title })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `hymn-${hymn.number}.png`
        a.click()
        URL.revokeObjectURL(a.href)
      }
    } catch {
      /* user dismissed the share sheet */
    } finally {
      setBusy(false)
    }
  }

  const copyText = async () => {
    const verse = hymn.verses[verseIndex]
    const text = `${hymn.title} — Hymn ${hymn.number}\n\n${verse.lines.join('\n')}\n\n— Seventh-day Adventist Hymnal`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="glass hairline flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[28px] px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-6 shadow-[var(--shadow-float)] sm:rounded-[28px] sm:pb-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-lyrics text-[20px] font-[450]">Share this hymn</h2>
          <button
            onClick={onDismiss}
            className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)]"
          >
            Done
          </button>
        </div>

        {/* Verse picker — scrolls on its own so it can never push the
            colours out of reach on a hymn with many verses. */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {hymn.verses.map((_, i) => (
            <button
              key={i}
              onClick={() => setVerseIndex(i)}
              className={`hairline shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-200 ${
                verseIndex === i
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'text-[var(--ink-2)]'
              }`}
            >
              {verseLabel(hymn.verses, i)}
            </button>
          ))}
        </div>

        {/* Colours — always visible */}
        <div className="mt-2.5 flex items-center gap-2.5">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPaletteId(p.id)}
              aria-label={`${p.label} colours`}
              aria-pressed={paletteId === p.id}
              title={p.label}
              className={`h-8 w-8 shrink-0 rounded-full transition-transform duration-200 ${
                paletteId === p.id
                  ? 'scale-110 ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper)]'
                  : 'hairline hover:scale-105'
              }`}
              style={{
                background:
                  p.id === 'mono'
                    ? 'linear-gradient(135deg, #f2f3f3 50%, #17191b 50%)'
                    : `linear-gradient(135deg, ${p.bgTop} 50%, ${p.accent} 50%)`,
              }}
            />
          ))}
          <span className="ml-auto text-[12px] text-[var(--ink-3)]">
            {PALETTES.find((p) => p.id === paletteId)?.label}
          </span>
        </div>

        {/* Preview */}
        <div className="hairline mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl shadow-[var(--shadow-soft)]">
          {imgUrl ? (
            <img src={imgUrl} alt="Share card preview" className="block h-full w-full object-contain" />
          ) : (
            <div className="aspect-[4/5] w-full animate-pulse bg-[var(--paper-raised)]" />
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={shareImage}
            disabled={busy || !imgUrl}
            className="flex-1 rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-[14.5px] font-semibold text-[var(--accent-contrast)] transition-opacity disabled:opacity-50"
          >
            {busy ? 'Sharing…' : 'Share image'}
          </button>
          <button
            onClick={copyText}
            className="hairline flex-1 rounded-2xl bg-[var(--paper-raised)] px-5 py-3.5 text-[14.5px] font-semibold text-[var(--ink)]"
          >
            {copied ? 'Copied ✓' : 'Copy text'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
