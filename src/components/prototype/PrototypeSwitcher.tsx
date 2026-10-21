// PROTOTYPE — throwaway. Lives only on the prototype/home-directions branch.
import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'
import type { AccentChoice } from '../Settings'

// PROTOTYPE — twelve designs, three of its own for each of the four themes, over the unchanged layout,
// ?variant=now|mono-1…sky-3. Each look lives in src/components/prototype/looks.css keyed on
// <html data-look>; the theme half of the key drives the app's real accent setting.
const THEMES = ['mono', 'sage', 'rose', 'sky'] as const
const NAMES: Record<string, string[]> = {
  mono: ['Ink wash', 'Moonrise', 'Folded paper'],
  sage: ['Meadow', 'Olive branch', 'Dappled shade'],
  rose: ['Petals', 'Rose window', 'Silk'],
  sky: ['Cloud bank', 'Horizon', 'Aurora'],
}
const LOOKS = [
  { key: 'now', name: 'Current' },
  ...THEMES.flatMap((t) =>
    NAMES[t].map((n, i) => ({ key: `${t}-${i + 1}`, name: `${t[0].toUpperCase()}${t.slice(1)} · ${n}` })),
  ),
]

export function LookSwitcher({ accent, setAccent }: { accent: AccentChoice; setAccent: (a: AccentChoice) => void }) {
  const [look, setLook] = useVariant(LOOKS.map((l) => l.key))
  useEffect(() => {
    const root = document.documentElement
    if (look === 'now') return void delete root.dataset.look
    const [theme, n] = look.split('-')
    root.dataset.look = n
    if (theme !== accent) setAccent(theme as AccentChoice)
  }, [look])
  return <PrototypeSwitcher variants={LOOKS} current={look} onChange={setLook} />
}

export function useVariant(keys: string[]) {
  const read = () => {
    const v = new URLSearchParams(location.search).get('variant')
    return v && keys.includes(v) ? v : keys[0]
  }
  const [variant, setVariant] = useState(read)
  const go = (v: string) => {
    const url = new URL(location.href)
    url.searchParams.set('variant', v)
    history.replaceState(null, '', url)
    setVariant(v)
  }
  return [variant, go] as const
}

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
}: {
  variants: { key: string; name: string }[]
  current: string
  onChange: (key: string) => void
}) {
  const i = variants.findIndex((v) => v.key === current)
  const step = (d: number) => onChange(variants[(i + d + variants.length) % variants.length].key)

  // Alt+←/→: the hymn reader already owns bare arrows for prev/next hymn.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (!e.altKey || t.closest('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!import.meta.env.DEV) return null
  return (
    <div className="fixed left-1/2 top-[max(env(safe-area-inset-top),10px)] z-[80] flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#c2410c] p-1 text-white shadow-lg">
      <button onClick={() => step(-1)} aria-label="Previous variant" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15">
        <ChevronLeftIcon size={18} />
      </button>
      <span className="min-w-[170px] text-center text-[12.5px] font-semibold">
        {variants[i].name}
      </span>
      <button onClick={() => step(1)} aria-label="Next variant" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15">
        <ChevronRightIcon size={18} />
      </button>
    </div>
  )
}
