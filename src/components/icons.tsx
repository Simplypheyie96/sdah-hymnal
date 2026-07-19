type IconProps = { size?: number; strokeWidth?: number; className?: string; filled?: boolean }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function BookIcon({ size = 22, strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M12 6.5C10.6 5 8.6 4.25 6 4.25c-1 0-1.9.12-2.75.36V18.4c.85-.24 1.75-.36 2.75-.36 2.6 0 4.6.75 6 2.21 1.4-1.46 3.4-2.21 6-2.21 1 0 1.9.12 2.75.36V4.61A10.6 10.6 0 0 0 18 4.25c-2.6 0-4.6.75-6 2.25Z" />
      <path d="M12 6.5v13.75" />
    </svg>
  )
}

export function HeartIcon({ size = 22, strokeWidth = 1.7, className, filled }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 20.25S3.75 15.5 3.75 9.75a4.5 4.5 0 0 1 8.25-2.48 4.5 4.5 0 0 1 8.25 2.48c0 5.75-8.25 10.5-8.25 10.5Z" />
    </svg>
  )
}

export function GearIcon({ size = 22, strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.17a2 2 0 1 1-4 0v-.17a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.88 1.7 1.7 0 0 0-1.56-1.03h-.17a2 2 0 1 1 0-4h.17a1.7 1.7 0 0 0 1.56-1.03 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.88.34h.09a1.7 1.7 0 0 0 .94-1.56v-.17a2 2 0 1 1 4 0v.17a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88v.09a1.7 1.7 0 0 0 1.56.94h.17a2 2 0 1 1 0 4h-.17a1.7 1.7 0 0 0-1.56 1.03Z" />
    </svg>
  )
}

export function SearchIcon({ size = 18, strokeWidth = 1.8, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 22, strokeWidth = 1.9, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 22, strokeWidth = 1.9, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  )
}

export function ShareIcon({ size = 20, strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M12 3.5v12" />
      <path d="m8 7 4-3.5L16 7" />
      <path d="M5.5 11.5v7a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

export function CastIcon({ size = 19, strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M3.5 6.5A2 2 0 0 1 5.5 4.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-5" />
      <path d="M3.5 12.5a6 6 0 0 1 6 6" />
      <path d="M3.5 16.5a2.5 2.5 0 0 1 2.5 2.5" />
      <circle cx="3.9" cy="19.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function KeypadIcon({ size = 19, strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="6" cy="6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="6" cy="18" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PresentIcon({ size = 20, strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="4.5" width="18" height="12.5" rx="2" />
      <path d="M12 17v3.5" />
      <path d="M8.5 20.5h7" />
    </svg>
  )
}

export function PlayIcon({ size = 20, strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className} fill="currentColor" stroke="none">
      <path d="M8.5 5.8v12.4a.6.6 0 0 0 .92.5l9.4-6.2a.6.6 0 0 0 0-1l-9.4-6.2a.6.6 0 0 0-.92.5Z" />
    </svg>
  )
}

export function PauseIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="currentColor" stroke="none">
      <rect x="7" y="5.5" width="3.4" height="13" rx="1" />
      <rect x="13.6" y="5.5" width="3.4" height="13" rx="1" />
    </svg>
  )
}

export function MusicOffIcon({ size = 20, strokeWidth = 1.7, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <path d="M9.5 17.5V8.7l9-2.2v8" />
      <circle cx="7" cy="17.5" r="2.5" />
      <circle cx="16" cy="16.5" r="2.5" />
      <path d="m4 4 16 16" />
    </svg>
  )
}
