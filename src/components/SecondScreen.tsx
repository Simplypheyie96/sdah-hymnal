import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import QRCode from 'qrcode'
import { canCast, receiverUrl } from '../lib/present'

/**
 * Getting a hymn onto a screen that will not cast.
 *
 * Chrome's Cast only finds Chromecast devices and Android TVs with Chromecast
 * built in. A Samsung, LG or Roku set that speaks only its own protocol never
 * appears in the picker, which reads as "no TV found" even though the TV is
 * right there. iPhones cannot cast at all.
 *
 * So this offers the route that works on every screen ever made: open a link
 * on the television itself, or on a laptop already plugged into it. The page
 * that opens is the same presenter, and it takes its own arrow keys.
 */
export function SecondScreen({
  songId,
  lang,
  onDismiss,
}: {
  songId: string
  lang: string
  onDismiss: () => void
}) {
  const url = receiverUrl(songId, lang)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void QRCode.toDataURL(url, {
      margin: 1,
      width: 480,
      color: { dark: '#0b0d0e', light: '#ffffff' },
    }).then(setQr)
  }, [url])

  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="glass hairline w-full max-w-md rounded-t-[28px] px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-6 shadow-[var(--shadow-float)] sm:rounded-[28px] sm:pb-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-lyrics text-[20px] font-[450]">Open on the TV</h2>
          <button
            onClick={onDismiss}
            className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)]"
          >
            Done
          </button>
        </div>

        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-2)]">
          Works with any television, whether or not it can cast — open this on the TV’s
          own browser, or on a laptop plugged into it.
        </p>

        {qr && (
          <div className="mt-5 flex justify-center">
            <img
              src={qr}
              alt="Scan to open the hymn on another screen"
              className="hairline h-[190px] w-[190px] rounded-2xl bg-white p-2"
            />
          </div>
        )}

        <button
          onClick={copy}
          className="hairline mt-5 w-full rounded-2xl bg-[var(--paper-raised)] px-4 py-3 text-left transition-colors hover:bg-[var(--accent)]/8"
        >
          <span className="eyebrow block text-[var(--ink-3)]">
            {copied ? 'Copied' : 'Tap to copy the link'}
          </span>
          <span className="mt-1 block truncate text-[13px] text-[var(--ink-2)]">{url}</span>
        </button>

        <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
          {canCast()
            ? 'Cast only finds Chromecast and Android TV. If your set uses its own system and never appears in the list, use this instead.'
            : 'iPhone and iPad cannot cast from a web page at all, so this is the way to reach a TV from here.'}
        </p>
      </motion.div>
    </motion.div>
  )
}
