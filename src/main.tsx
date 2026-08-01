import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App.tsx'
import { HymnalProvider } from './data/hymnal.tsx'

// Visitor counts. Cookieless and anonymous: page path, referrer, country,
// device class. No identifiers, nothing that follows anyone between sites,
// and nothing that needs a consent banner.
//
// Anything sent while offline is simply lost, so these numbers under-report
// by design. That is the price of an app built to work in a hall with no
// connection, and the figures should be read as a floor rather than a count.
inject()

// The service worker is registered from React (see useAppUpdate), which also
// drives the Refresh prompt when a newer build is waiting.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HymnalProvider>
      <App />
    </HymnalProvider>
  </StrictMode>,
)
