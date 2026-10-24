// The store apps (Capacitor, branch `store`): the same hymnal in a webview,
// bundled whole so it works with no signal. Everything here is inert on the
// web: Capacitor only exists inside the apps, and its plugins load lazily,
// only there.
const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } })
  .Capacitor

export const storeApp = Boolean(cap?.isNativePlatform?.())
export const androidApp = storeApp && cap?.getPlatform?.() === 'android'
export const STORE = androidApp ? 'Google Play' : 'the App Store'

/** The public site, for links that must open outside the app (a TV, a share). */
export const SITE = 'https://sdahymnal.vercel.app/'

/** Status bar icons follow the app's own theme, not the phone's. */
export async function setBarsDark(dark: boolean) {
  if (!storeApp) return
  const { SystemBars, SystemBarsStyle } = await import('@capacitor/core')
  await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}

// Tips: consumables that unlock nothing. There is no server, so nothing to
// verify a receipt against: the store charges, the app says thank you, and the
// purchase is finished on the spot (consumed on Android) so it can be given again.
export const TIPS = ['tip1', 'tip2', 'tip3'] as const
export type Tip = (typeof TIPS)[number]
const product = (t: Tip) => `com.feyidesigns.sdahymnal.${t}`

/** Store prices as the reader's storefront shows them. Empty if the store can't answer. */
export async function tipPrices(): Promise<Partial<Record<Tip, string>>> {
  const { NativePurchases } = await import('@capgo/native-purchases')
  const { products } = await NativePurchases.getProducts({ productIdentifiers: TIPS.map(product) })
  const out: Partial<Record<Tip, string>> = {}
  for (const p of products) {
    const t = TIPS.find((t) => product(t) === p.identifier)
    if (t) out[t] = p.priceString
  }
  return out
}

/** Resolves true once paid, false if the reader backed out. */
export async function giveTip(t: Tip): Promise<boolean> {
  const { NativePurchases } = await import('@capgo/native-purchases')
  try {
    await NativePurchases.purchaseProduct({ productIdentifier: product(t), quantity: 1, isConsumable: true })
    return true
  } catch (e) {
    const { code, message } = e as { code?: string; message?: string }
    // iOS says "User cancelled", Play says USER_CANCELED
    if (/cancel/i.test(`${code} ${message}`)) return false
    throw e
  }
}
