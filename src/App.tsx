import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import type { LangCode } from './data/hymns'
import { useHymnal } from './data/hymnal'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useMediaQuery } from './hooks/useMediaQuery'
import { Home } from './components/Home'
import { Favorites } from './components/Favorites'
import { Settings, type AccentChoice, type ThemeChoice } from './components/Settings'
import { HymnContent, HymnOverlay } from './components/HymnView'
import { Presenter } from './components/Presenter'
import { Splash } from './components/Splash'
import { InstallBanner } from './components/Install'
import { UpdatePrompt } from './components/UpdatePrompt'
import { useAppUpdate } from './hooks/useAppUpdate'
import { setBarsDark, storeApp } from './lib/native'
import { TabBar, type Tab } from './components/TabBar'
import { BookIcon } from './components/icons'
import { ReceiverScreen } from './components/ReceiverScreen'
import './components/prototype/looks.css'

// When a phone casts a hymn, the television opens this same app with
// ?present=… — it renders only the receiver screen, never the full UI.
const castTarget = (() => {
  const p = new URLSearchParams(window.location.search)
  const songId = p.get('present')
  return songId ? { songId, lang: (p.get('lang') as LangCode) || 'en' } : null
})()

// Every hymn has its own address (/hymn/100, /yo/hymn/12), prerendered for
// search engines by scripts/seo-pages.mjs. Landing on one opens that hymn.
const linked = (() => {
  const m = window.location.pathname.match(/^\/(?:(yo)\/)?hymn\/(\d+)\/?$/)
  return m ? { lang: (m[1] ?? 'en') as LangCode, songId: m[1] ? `yo-${m[2]}` : `sdah-${m[2]}` } : null
})()
const homeTitle = 'SDA Hymnal — Seventh-day Adventist Hymnal Online, All 920 Hymns'

// Paints the status bar (theme-color) with the current theme's top colour. The fixed
// near-white in index.html met a tinted sky in a hard, blurred seam on iPhone. A canvas
// turns the oklch token into hex, which every browser's theme-color accepts.
function syncStatusBar() {
  const probe = document.createElement('div')
  probe.style.color = 'var(--look-top)'
  document.body.appendChild(probe)
  const ctx = document.createElement('canvas').getContext('2d')
  if (ctx) {
    ctx.fillStyle = getComputedStyle(probe).color
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', hex))
  }
  probe.remove()
  void setBarsDark(document.documentElement.classList.contains('dark'))
}

export default function App() {
  const { ready, ensure, hymnsFor, resolve } = useHymnal()
  const [tab, setTab] = useState<Tab>('hymns')
  const [openSongId, setOpenSongId] = useState<string | null>(linked?.songId ?? null)
  const [lang, setLang] = useLocalStorage<LangCode>('sdah.lang', 'en')
  const [theme, setTheme] = useLocalStorage<ThemeChoice>('sdah.theme', 'system')
  const [accent, setAccent] = useLocalStorage<AccentChoice>('sdah.accent', 'mono')
  const [fontScale, setFontScale] = useLocalStorage<number>('sdah.fontScale', 1)
  const [favorites, setFavorites] = useLocalStorage<string[]>('sdah.favorites.v2', [])
  const splitView = useMediaQuery('(min-width: 900px)')

  // Surfaces the Refresh nudge when a newer build is waiting. Called here, above
  // the two layout branches, so the worker registers once regardless of which
  // branch renders.
  const { needRefresh, refresh } = useAppUpdate()

  // Presenting lives up here rather than inside the hymn view because going
  // fullscreen changes the viewport, which can flip `splitView` and swap the
  // whole tree between the two branches below. Held any lower, the presenter
  // would tear itself down the instant it opened — and reopen, and tear down
  // again. It also means rotating an iPad mid-hymn no longer drops the words
  // off the screen.
  const [presenting, setPresenting] = useState(false)

  // On a wide screen both panes are visible at once, so an empty reading pane
  // is just a hole in the layout. Open the first hymn so there is something to
  // read the moment the app loads. Only ever fires when nothing is selected,
  // so it cannot fight a choice the reader has already made.
  useEffect(() => {
    if (!ready || !splitView || openSongId || tab !== 'hymns') return
    const first = hymnsFor(lang)[0]
    if (first) setOpenSongId(first.songId)
  }, [ready, splitView, openSongId, tab, lang, hymnsFor])

  useEffect(() => {
    if (castTarget) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      syncStatusBar()
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    if (accent === 'mono') delete root.dataset.accent
    else root.dataset.accent = accent
    syncStatusBar()
  }, [accent])

  useEffect(() => {
    if (linked) setLang(linked.lang)
  }, [setLang])

  // Editions load lazily; the one the user is reading in must be in flight.
  useEffect(() => ensure(lang), [ensure, lang])

  // The song the user opened, resolved in their chosen language when that
  // edition has it; otherwise fall back to English so there is always text.
  const requested = openSongId ? resolve(openSongId, lang) : undefined
  const fallback = openSongId ? resolve(openSongId, 'en') : undefined
  const displayed = requested ?? fallback

  // The address bar and tab title follow the open hymn, so a shared or
  // bookmarked link lands on it.
  useEffect(() => {
    if (castTarget || (openSongId && !displayed)) return
    const path = displayed ? `${displayed.lang === 'en' ? '' : `/${displayed.lang}`}/hymn/${displayed.number}` : '/'
    const here = window.location.pathname
    if (here !== path && (displayed || linked || /\/hymn\//.test(here))) history.replaceState(null, '', path + window.location.search)
    document.title = displayed ? `${displayed.number} · ${displayed.title} — SDA Hymnal` : homeTitle
  }, [openSongId, displayed])

  // When the chosen edition has no counterpart we still show the song, but
  // the reader says which hymnal it is missing from rather than pretending.
  const unavailableIn = displayed && !requested ? lang : undefined

  // Favourites follow the song, not the edition: hearting a hymn in Yorùbá
  // shows it hearted in English too.
  const favKey = (h: { songId: string; sdahRef?: number; lang: string; number: number }) =>
    h.lang === 'en' ? `sdah-${h.number}` : h.sdahRef ? `sdah-${h.sdahRef}` : h.songId

  // Previous/next walk the numbering of whichever edition is on screen.
  const editionList = displayed ? hymnsFor(displayed.lang) : []
  const idx = displayed ? editionList.findIndex((h) => h.songId === displayed.songId) : -1
  const prev = idx > 0 ? editionList[idx - 1].songId : undefined
  const next = idx >= 0 && idx < editionList.length - 1 ? editionList[idx + 1].songId : undefined

  const toggleFavorite = (songId: string) =>
    setFavorites((p) => (p.includes(songId) ? p.filter((x) => x !== songId) : [...p, songId]))

  // Switching tabs closes any open hymn, so the reader lands on the tab they
  // tapped rather than a hymn overlaying it. This matters in split view, where
  // the hymns tab auto-opens the first hymn (below): without this, that hymn
  // carried over as a full-screen overlay on Favourites and Settings.
  const changeTab = (t: Tab) => {
    if (t !== tab) setOpenSongId(null)
    setTab(t)
  }

  const hymnProps = displayed && {
    hymn: displayed,
    lang,
    onLang: setLang,
    unavailableIn,
    fontScale,
    isFavorite: favorites.includes(favKey(displayed)),
    onToggleFavorite: () => toggleFavorite(favKey(displayed)),
    onNavigate: setOpenSongId,
    prev,
    next,
  }

  // The television's copy shows the hymn and nothing else.
  if (castTarget) {
    return <ReceiverScreen songId={castTarget.songId} lang={castTarget.lang} />
  }

  // iPad / desktop: split view for the hymns tab
  // One instance, above both branches. Rendered inside each of them, crossing
  // the split-view breakpoint would unmount one copy and mount the other,
  // replaying the opening animation mid-use — the same class of bug as the
  // presenter tearing itself down.
  const splash = <Splash ready={ready} />

  const presenter =
    presenting && hymnProps ? (
      <Presenter hymn={hymnProps.hymn} onClose={() => setPresenting(false)} />
    ) : null

  if (splitView && tab === 'hymns') {
    return (
      <div className="mx-auto flex h-dvh max-w-7xl">
        {splash}
        <aside className="w-[400px] shrink-0 overflow-y-auto border-r border-[var(--line)]">
          <Home onOpen={setOpenSongId} selected={displayed?.songId ?? null} lang={lang} onLang={setLang} />
          <TabBar tab={tab} onChange={changeTab} dock="left" />
        </aside>
        <main className="relative flex flex-1 flex-col overflow-y-auto">
          {hymnProps ? (
            <HymnContent
              key={displayed!.songId}
              {...hymnProps}
              inline
              presenting={presenting}
              onPresent={() => setPresenting(true)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
              <div className="hairline flex h-16 w-16 items-center justify-center rounded-full bg-[var(--paper-raised)] text-[var(--ink-3)]">
                <BookIcon size={26} />
              </div>
              <p className="font-lyrics mt-7 text-[21px] text-[var(--ink-2)]">Select a hymn</p>
              <p className="mx-auto mt-2.5 max-w-[260px] text-[13.5px] leading-relaxed text-[var(--ink-3)]">
                Choose from the list, or search by number or title.
              </p>
            </div>
          )}
        </main>
        <UpdatePrompt show={needRefresh} onRefresh={refresh} />
        <AnimatePresence>{presenter}</AnimatePresence>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-2xl">
      {splash}
      {tab === 'hymns' && (
        <Home onOpen={setOpenSongId} selected={displayed?.songId ?? null} lang={lang} onLang={setLang} />
      )}
      {tab === 'favorites' && <Favorites favorites={favorites} onOpen={setOpenSongId} />}
      {tab === 'settings' && (
        <Settings
          theme={theme}
          onTheme={setTheme}
          accent={accent}
          onAccent={setAccent}
          fontScale={fontScale}
          onFontScale={setFontScale}
        />
      )}

      <TabBar tab={tab} onChange={changeTab} />

      {/* Only on the Hymns tab: elsewhere it would float over unrelated
          content, and the nudge belongs where a first-time reader lands. */}
      {tab === 'hymns' && !storeApp && <InstallBanner />}

      <UpdatePrompt show={needRefresh} onRefresh={refresh} />

      <AnimatePresence>{presenter}</AnimatePresence>

      <AnimatePresence>
        {hymnProps && (
          <HymnOverlay
            key="hymn-overlay"
            {...hymnProps}
            onClose={() => setOpenSongId(null)}
            presenting={presenting}
            onPresent={() => setPresenting(true)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
