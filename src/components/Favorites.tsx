import { useHymnal } from '../data/hymnal'
import { HeartIcon } from './icons'

export function Favorites({
  favorites,
  onOpen,
}: {
  favorites: string[]
  onOpen: (songId: string) => void
}) {
  const { hymnsFor } = useHymnal()
  const items = hymnsFor('en').filter((h) => favorites.includes(h.songId))

  return (
    <div className="pb-36">
      <header className="px-6 pt-[max(env(safe-area-inset-top),28px)]">
        <p className="rise-in pt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-3)]">
          Saved for Sabbath
        </p>
        <h1 className="rise-in font-lyrics mt-1.5 text-[44px] font-[350] leading-none tracking-[-0.02em]" style={{ animationDelay: '60ms' }}>
          Favorites
        </h1>
      </header>

      {items.length === 0 ? (
        <div className="rise-in px-8 pt-24 text-center" style={{ animationDelay: '140ms' }}>
          <div className="hairline mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--paper-raised)] text-[var(--ink-3)]">
            <HeartIcon size={26} strokeWidth={1.5} />
          </div>
          <p className="font-lyrics mt-7 text-[21px] text-[var(--ink-2)]">No favorites yet</p>
          <p className="mx-auto mt-2.5 max-w-[260px] text-[13.5px] leading-relaxed text-[var(--ink-3)]">
            Tap the heart on any hymn and it will wait for you here.
          </p>
        </div>
      ) : (
        <div className="mt-8 divide-y divide-[var(--line)]">
          {items.map((h, i) => (
            <button
              key={h.songId}
              onClick={() => onOpen(h.songId)}
              className="rise-in group flex w-full items-baseline gap-5 px-6 py-[18px] text-left transition-colors duration-200 hover:bg-[var(--paper-raised)]"
              style={{ animationDelay: `${120 + i * 50}ms` }}
            >
              <span className="font-lyrics w-12 shrink-0 text-right text-[22px] font-[250] tabular-nums text-[var(--ink-3)] group-hover:text-[var(--ink)]">
                {h.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-medium tracking-[-0.01em]">{h.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-[var(--ink-3)]">{h.category}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
