import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import QRCode from 'qrcode'
import { canCast, receiverUrl } from '../lib/present'

/**
 * Getting a hymn onto a screen.
 *
 * Three routes, in the order most people should try them.
 *
 * Mirroring comes first because it is the only one that needs nothing from
 * us and nothing typed on the television. Nearly every Android phone and
 * nearly every smart TV sold in the last decade speak Miracast under one
 * brand name or another — Smart View on Samsung, Anyview Cast on Hisense —
 * and the presenter is already a full-bleed screen, so mirroring it is
 * exactly what a projector would show.
 *
 * Cast comes last despite being the obvious button, because Chrome only
 * discovers devices with Chromecast built in. A Hisense running VIDAA, an
 * LG running webOS, a Samsung running Tizen — none of them will ever appear
 * in that picker, and an empty list reads as a broken app rather than as an
 * unsupported protocol. Saying so here is kinder than letting someone hunt.
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
  const [route, setRoute] = useState<'mirror' | 'link'>('mirror')

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
        className="glass hairline max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[28px] px-7 pb-[max(env(safe-area-inset-bottom),28px)] pt-7 shadow-[var(--shadow-float)] sm:rounded-[28px] sm:pb-7"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-lyrics text-[21px] font-[450]">Put this on the TV</h2>
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--ink-2)] transition-colors hover:bg-[var(--paper-raised)]"
          >
            Done
          </button>
        </div>

        <div className="hairline mt-6 flex gap-1 rounded-full bg-[var(--paper-raised)] p-1">
          {(
            [
              ['mirror', 'Mirror the screen'],
              ['link', 'Open a link'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRoute(key)}
              className={`flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors ${
                route === key
                  ? 'bg-[var(--accent)]/15 text-[var(--accent-ink)]'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink-1)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {route === 'mirror' ? (
          <div className="mt-6">
            <p className="text-[13.5px] leading-relaxed text-[var(--ink-2)]">
              Nothing to type on the television, and it works with sets that cannot cast —
              Hisense, LG, Samsung and the rest. Your whole screen goes across, so leave the
              hymn open in this presenter.
            </p>

            <ol className="mt-6 space-y-4">
              {[
                ['On the TV', 'Open the input or source list and turn on screen mirroring. Hisense calls it Anyview Cast, LG calls it Screen Share, Sony and others just say Screen Mirroring.'],
                ['On your phone', 'Swipe down for the quick settings and tap Smart View on Samsung, or Cast on most other Android phones.'],
                ['Pick the TV', 'Choose it from the list. The hymn fills the screen, and this phone stays the remote.'],
              ].map(([label, body], i) => (
                <li key={label} className="flex gap-4">
                  <span className="numeral shrink-0 text-[17px] leading-tight text-[var(--accent-ink)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="eyebrow text-[var(--ink-3)]">{label}</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
              iPhone and iPad mirror to Apple TV with AirPlay, but not to most other
              televisions. On those, use “Open a link” instead.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-[13.5px] leading-relaxed text-[var(--ink-2)]">
              For a TV with its own web browser, or a laptop already plugged into one. The
              page that opens is this same presenter, and it takes its own arrow keys.
            </p>

            {qr && (
              <div className="mt-6 flex justify-center">
                <img
                  src={qr}
                  alt="Scan to open the hymn on another screen"
                  className="hairline h-[172px] w-[172px] rounded-2xl bg-white p-2.5"
                />
              </div>
            )}

            <button
              onClick={copy}
              className="hairline mt-6 w-full rounded-2xl bg-[var(--paper-raised)] px-4 py-3.5 text-left transition-colors hover:bg-[var(--accent)]/8"
            >
              <span className="eyebrow block text-[var(--ink-3)]">
                {copied ? 'Copied' : 'Tap to copy the link'}
              </span>
              <span className="mt-1.5 block truncate text-[13px] text-[var(--ink-2)]">
                {url}
              </span>
            </button>

            <p className="mt-6 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
              {canCast()
                ? 'The Cast button only finds Chromecast and Android TV. A set running VIDAA, webOS or Tizen will never appear in that list, however long you wait.'
                : 'iPhone and iPad cannot cast from a web page at all, so this is the way to reach a TV from here.'}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
