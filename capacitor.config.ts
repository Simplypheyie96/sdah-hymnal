import type { CapacitorConfig } from '@capacitor/cli'

// The iOS and Android apps bundle dist/ (npm run ios / npm run android); hymn
// texts load from the app itself, never from the website.
const config: CapacitorConfig = {
  appId: 'com.feyidesigns.sdahymnal',
  appName: 'Hymnal',
  webDir: 'dist',
  ios: { contentInset: 'never' },
  // Android: env(safe-area-inset-*) holds the real insets (or the webview is
  // padded on old Chromium), so the web's own CSS needs no native variant.
  plugins: { SystemBars: { insetsHandling: 'native' } },
}

export default config
