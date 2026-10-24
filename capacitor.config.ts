import type { CapacitorConfig } from '@capacitor/cli'

// The iOS and Android apps bundle dist/ (npm run ios / npm run android); hymn
// texts load from the app itself, never from the website.
const config: CapacitorConfig = {
  appId: 'com.feyidesigns.sdahymnal',
  appName: 'Hymnal',
  webDir: 'dist',
  ios: { contentInset: 'never' },
}

export default config
