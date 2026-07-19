import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Hymn, Verse } from '../data/hymns'

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

const PALETTES: Palette[] = [
  { id: 'mono', label: 'Paper', bgTop: '#f4f4f3', bgBottom: '#e9eae8', ink: '#191b1d', accent: '#6f7477', muted: '#8b9195' },
  { id: 'rose', label: 'Rose', bgTop: '#f9e4e0', bgBottom: '#f4d5d2', ink: '#42221f', accent: '#c8553d', muted: '#a97f78' },
  { id: 'sage', label: 'Sage', bgTop: '#e7efe4', bgBottom: '#d8e5d6', ink: '#22391f', accent: '#c07a3e', muted: '#748a70' },
  { id: 'sky', label: 'Sky', bgTop: '#e1e9f4', bgBottom: '#d1ddee', ink: '#1c2f4d', accent: '#b98a3e', muted: '#7488a6' },
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
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  await Promise.all([
    document.fonts.load('400 240px "Bodoni Moda"'),
    document.fonts.load('500 58px "EB Garamond"'),
    document.fonts.load('400 44px "EB Garamond"'),
    document.fonts.load('italic 400 44px "EB Garamond"'),
  ]).catch(() => {})

  const p = PALETTES.find((x) => x.id === paletteId)!
  const mono = paletteId === 'mono'
  const bgTop = mono && dark ? '#14161a' : p.bgTop
  const bgBottom = mono && dark ? '#0e1013' : p.bgBottom
  const ink = mono && dark ? '#eef0f1' : p.ink
  const accent = mono && dark ? '#9aa1a6' : p.accent
  const muted = mono && dark ? '#71787d' : p.muted

  // Soft gradient field
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, bgTop)
  grad.addColorStop(1, bgBottom)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Paper grain, tinted with the ink tone
  const [ir, ig, ib] = [
    parseInt(ink.slice(1, 3), 16),
    parseInt(ink.slice(3, 5), 16),
    parseInt(ink.slice(5, 7), 16),
  ]
  for (let i = 0; i < 26000; i++) {
    ctx.fillStyle = `rgba(${ir},${ig},${ib},${Math.random() * 0.05})`
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(${ir},${ig},${ib},${0.08 + Math.random() * 0.1})`
    const s = 1.5 + Math.random() * 2.5
    ctx.fillRect(Math.random() * W, Math.random() * H, s, s)
  }

  ctx.textAlign = 'center'

  // The card is composed like a hymnal title page: a struck numeral, the
  // title beneath it, then the verse set as reading text. Lyrics keep their
  // original case — uppercasing mangles Yorùbá and Igbo diacritics.

  // Eyebrow
  ctx.fillStyle = muted
  ctx.font = '600 24px -apple-system, system-ui, sans-serif'
  ctx.fillText('S E V E N T H - D A Y   A D V E N T I S T   H Y M N A L', W / 2, 122)

  // Hero numeral — the app's signature, a hymn-board plate number
  ctx.fillStyle = accent
  ctx.font = '400 240px "Bodoni Moda", Didot, Georgia, serif'
  ctx.fillText(String(hymn.number), W / 2, 366)

  // Title
  ctx.fillStyle = ink
  ctx.font = '500 58px "EB Garamond", Georgia, serif'
  const titleLines = wrapLines(ctx, hymn.title, 880)
  let ty = 452
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, ty)
    ty += 70
  }

  // Hairline rule under the title block
  ctx.strokeStyle = accent
  ctx.globalAlpha = 0.45
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W / 2 - 52, ty + 6)
  ctx.lineTo(W / 2 + 52, ty + 6)
  ctx.stroke()
  ctx.globalAlpha = 1

  // Verse — set as reading text, auto-fitted to the remaining space
  const verse = hymn.verses[verseIndex]
  const italic = verse.isRefrain ? 'italic ' : ''
  const top = ty + 70
  const bottom = H - 230
  const room = bottom - top

  let fontSize = 52
  let lines: string[] = []
  for (; fontSize >= 30; fontSize -= 3) {
    ctx.font = `${italic}400 ${fontSize}px "EB Garamond", Georgia, serif`
    lines = verse.lines.flatMap((l) => wrapLines(ctx, l, 860))
    if (lines.length * fontSize * 1.52 <= room) break
  }
  const lineHeight = fontSize * 1.52
  const blockTop = top + Math.max(0, (room - lines.length * lineHeight) / 2)
  ctx.font = `${italic}400 ${fontSize}px "EB Garamond", Georgia, serif`
  ctx.fillStyle = ink
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, blockTop + (i + 1) * lineHeight)
  })

  // Footer: verse label, then the wordmark
  ctx.fillStyle = muted
  ctx.font = '600 25px -apple-system, system-ui, sans-serif'
  ctx.fillText(verseLabel(hymn.verses, verseIndex).toUpperCase(), W / 2, H - 148)

  ctx.fillStyle = accent
  ctx.font = '500 40px "EB Garamond", Georgia, serif'
  ctx.fillText('Hymnal', W / 2, H - 88)

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

        {/* Verse + palette pickers */}
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
          <span className="mx-1 h-5 w-px shrink-0 bg-[var(--line-strong)]" />
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPaletteId(p.id)}
              aria-label={`${p.label} colors`}
              title={p.label}
              className={`h-7 w-7 shrink-0 rounded-full transition-transform duration-200 ${
                paletteId === p.id
                  ? 'scale-110 ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--paper)]'
                  : 'hairline'
              }`}
              style={{
                background:
                  p.id === 'mono'
                    ? 'linear-gradient(135deg, #f2f3f3 50%, #17191b 50%)'
                    : `linear-gradient(135deg, ${p.bgTop} 50%, ${p.accent} 50%)`,
              }}
            />
          ))}
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
