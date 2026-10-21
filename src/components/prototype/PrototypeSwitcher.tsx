// PROTOTYPE — throwaway. Lives only on the prototype/home-directions branch.
import { useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'

// PROTOTYPE — three visual directions over the unchanged layout, ?variant=now|A|B|C.
// Each look is a token set in src/components/prototype/looks.css keyed on <html data-look>.
const LOOKS = [
  { key: 'now', name: 'Current' },
  { key: 'A', name: 'Gilt hymnal' },
  { key: 'B', name: 'Vespers' },
  { key: 'C', name: 'Signal' },
]

export function LookSwitcher() {
  const [look, setLook] = useVariant(LOOKS.map((l) => l.key))
  useEffect(() => {
    const root = document.documentElement
    if (look === 'now') delete root.dataset.look
    else root.dataset.look = look
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
      <span className="min-w-[150px] text-center text-[12.5px] font-semibold">
        {variants[i].key} · {variants[i].name}
      </span>
      <button onClick={() => step(1)} aria-label="Next variant" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15">
        <ChevronRightIcon size={18} />
      </button>
    </div>
  )
}
