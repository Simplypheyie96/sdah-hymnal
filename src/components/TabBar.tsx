import { BookIcon, HeartIcon, GearIcon } from './icons'

export type Tab = 'hymns' | 'favorites' | 'settings'

const TABS: { id: Tab; label: string; Icon: typeof BookIcon }[] = [
  { id: 'hymns', label: 'Hymns', Icon: BookIcon },
  { id: 'favorites', label: 'Favorites', Icon: HeartIcon },
  { id: 'settings', label: 'Settings', Icon: GearIcon },
]

export function TabBar({
  tab,
  onChange,
  dock = 'center',
}: {
  tab: Tab
  onChange: (t: Tab) => void
  dock?: 'center' | 'left'
}) {
  return (
    <nav
      className={`fixed bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 pointer-events-none ${
        dock === 'left' ? 'left-0 w-[400px]' : 'inset-x-0'
      }`}
    >
      <div className="mx-auto w-fit pointer-events-auto">
        {/* The container's ends are semicircles, so the space available at the
            active pill's *corner* is far less than the flat padding suggests:
            at 12px the corner had only 4px of clearance and read as clipped.
            20px puts it at a comfortable ~12px. */}
        <div className="glass hairline flex items-center gap-1 rounded-full px-5 py-2 shadow-[var(--shadow-float)]">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                aria-label={label}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium transition-all duration-300 ${
                  active
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
                }`}
              >
                <Icon size={19} />
                {active && <span>{label}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
