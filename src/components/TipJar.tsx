import { useState } from 'react'
import PaystackPop from '@paystack/inline-js'

// The publishable key is meant to live in client code — it can only start a
// checkout, never move money or read the account. Wired through an env var so
// it is set once in Vercel rather than hardcoded; see .env.local for local dev.
const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined

// The quick-fill chips. The donor can still type any amount over these — the
// smallest is the floor we suggest, not one Paystack enforces.
const PRESETS = [2000, 5000, 10000]
const MIN_NAIRA = 100

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export function TipJar() {
  const [amount, setAmount] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'paying' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const value = Number(amount)
  const amountOk = Number.isFinite(value) && value >= MIN_NAIRA
  const canGive = amountOk && looksLikeEmail(email) && status !== 'paying'

  function give() {
    if (!canGive) return
    if (!PAYSTACK_KEY) {
      setStatus('error')
      setError('Tips are briefly unavailable — please try again later.')
      return
    }
    setError('')
    setStatus('paying')
    try {
      const paystack = new PaystackPop()
      paystack.newTransaction({
        key: PAYSTACK_KEY,
        email: email.trim(),
        amount: Math.round(value * 100), // Paystack counts in kobo
        currency: 'NGN',
        onSuccess: () => setStatus('done'),
        onCancel: () => setStatus('idle'),
      })
    } catch {
      setStatus('error')
      setError('Could not open checkout — please try again.')
    }
  }

  if (status === 'done') {
    return (
      <div className="px-5 py-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)]">
          <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <p className="mt-4 font-lyrics text-[19px] text-[var(--ink)]">Thank you</p>
        <p className="mx-auto mt-1.5 max-w-[16rem] text-[13.5px] leading-relaxed text-[var(--ink-2)]">
          Your gift genuinely helps keep the hymnal free and the recordings
          playing. It means a lot.
        </p>
        <button
          type="button"
          onClick={() => {
            setAmount('')
            setStatus('idle')
          }}
          className="mt-4 text-[13px] font-medium text-[var(--ink-3)] underline underline-offset-4"
        >
          Give again
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 py-5">
      <p className="text-[14.5px] leading-relaxed text-[var(--ink-2)]">
        This app is free, and always will be — no ads, no subscription, nothing
        to buy. It is built and run by one Adventist, out of pocket and after
        hours. If it has blessed your worship, you are welcome to leave the
        builder a tip toward hosting and the hymn recordings. Never expected,
        always appreciated.
      </p>

      <div className="mt-5 flex gap-2">
        {PRESETS.map((n) => {
          const active = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(String(n))}
              className={`h-10 flex-1 rounded-full text-[13.5px] font-semibold transition-colors duration-150 ${
                active
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'hairline text-[var(--ink-2)]'
              }`}
            >
              {naira(n)}
            </button>
          )
        })}
      </div>

      <label className="mt-3 flex h-12 items-center gap-1 rounded-2xl px-4 hairline focus-within:shadow-[inset_0_0_0_1.5px_var(--accent)]">
        <span className="text-[15px] text-[var(--ink-3)]">₦</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="Preferred amount"
          aria-label="Tip amount in naira"
          className="w-full bg-transparent text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none"
        />
      </label>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Email for your receipt"
        aria-label="Email for your receipt"
        className="mt-2.5 h-12 w-full rounded-2xl px-4 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] hairline focus:shadow-[inset_0_0_0_1.5px_var(--accent)] focus:outline-none"
      />

      <button
        type="button"
        onClick={give}
        disabled={!canGive}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-[14.5px] font-semibold text-[var(--accent-contrast)] shadow-[var(--shadow-soft)] transition-transform duration-200 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        {status === 'paying' ? (
          'Opening…'
        ) : (
          <>
            <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {amountOk ? `Leave ${naira(value)}` : 'Leave a tip'}
          </>
        )}
      </button>

      <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
        {error ? (
          <span className="text-[var(--accent-ink)]">{error}</span>
        ) : (
          'Secured by Paystack — pay by bank transfer, USSD, OPay, or card, whichever is easiest. No name or card needed up front, and the app itself collects nothing.'
        )}
      </p>
    </div>
  )
}
