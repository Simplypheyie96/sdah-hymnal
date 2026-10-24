# App Store and Google Play launch

The store apps are the web app in a Capacitor shell (`ios/`, `android/`, id `com.feyidesigns.sdahymnal`,
name `Hymnal`). Hymn texts, fonts and the app itself ship inside the build, so it opens and reads with no
signal. Natively the app has no service worker, no Vercel analytics, no install prompt and no Paystack;
tips go through the stores instead. Everything native is gated on `Capacitor.isNativePlatform()`
(`src/lib/native.ts`), so sdahymnal.vercel.app is unchanged.

## 0 · Blockers: settle before you submit anything

- [ ] **Rights to the hymn texts and recordings.** The *Seventh-day Adventist Hymnal* (1985) is
      © Review and Herald Publishing Association; many texts and tunes in it are public domain, but the
      compilation, many modern texts, translations and arrangements are not. Putting them in a store app
      is publishing them, and Apple (guideline 5.2.1) and Google can ask for proof. One of these:
      1. Written permission from the Review and Herald Publishing Association for the English texts, from
         whoever holds the Yorùbá edition for the Yorùbá texts, and from whoever owns each recording.
      2. Ship only public-domain texts plus recordings you made or own outright, and drop the rest from
         the store build.
      Keep the permission letters; you will paste them into App Review notes and Play's "content rights".
- [ ] **The store name.** "Seventh-day Adventist" and "Adventist" are registered trademarks of the
      General Conference Corporation of Seventh-day Adventists. Do not put them in the store name, subtitle
      or icon without written permission from the General Conference's Office of General Counsel. The app
      header also says "Seventh-day Adventist", so ask about that in the same letter. A neutral name is
      ready: `Hymnal` (display name on the phone). For the listing something like
      `Hymnal: English & Yorùbá` once availability is checked in both stores.
- [ ] **Recordings offline in the app need one R2 change (you, in Cloudflare).** Playing streams fine
      today, but saving a recording for offline uses `fetch`, and the R2 bucket's CORS only allows
      `https://sdahymnal.vercel.app`. Until it also allows the app origins, the apps play recordings online
      only and quietly skip saving them. In Cloudflare → R2 → the audio bucket → Settings → CORS policy,
      add the two app origins next to the existing one:

      ```json
      [
        {
          "AllowedOrigins": ["https://sdahymnal.vercel.app", "capacitor://localhost", "https://localhost"],
          "AllowedMethods": ["GET", "HEAD"],
          "AllowedHeaders": ["*"]
        }
      ]
      ```

      `capacitor://localhost` is iOS, `https://localhost` is Android. Check: open a hymn in the app, play
      it, turn on aeroplane mode, play it again. Not yet checked: that WKWebView exposes the Cache API on
      `capacitor://` (the code skips saving cleanly if it does not).

## 1 · Tips: how they work

- Three consumables, labelled in the app as a thank-you that unlocks nothing:

  | Product id | Reference name | Price |
  |---|---|---|
  | `com.feyidesigns.sdahymnal.tip1` | Small tip | $0.99 (Tier 1) |
  | `com.feyidesigns.sdahymnal.tip2` | Kind tip | $2.99 |
  | `com.feyidesigns.sdahymnal.tip3` | Generous tip | $4.99 |

- **No server, no receipt check, on purpose.** A tip buys nothing to protect: the store charges, the app
  says thank you, and the purchase is finished on the spot (consumed on Android) so it can be given again.
  If the store can't answer, the tip jar says tips are unavailable and nothing else changes.
- Paystack stays on the web only. Never link to it, or to any outside payment, from the apps
  (Apple 3.1.1, Play payments policy).
- `ios/App/App/Hymnal.storekit` holds the same three products, and the shared `App` scheme uses it, so
  **Product → Run from Xcode** shows real-looking prices and a test purchase sheet in the Simulator.
  Launched any other way (or before App Store Connect has the products), the tip jar shows "unavailable".

## 2 · Build commands

```bash
npm run ios
```

Builds the web app, swaps Google Fonts for the vendored copies in `native/fonts/`, and syncs into `ios/`.
Then open `ios/App/App.xcodeproj` in Xcode, pick your team under Signing & Capabilities, add the
**In-App Purchase** capability, and Product → Archive → Distribute → App Store Connect.

```bash
npm run android
npm run android:bundle
```

The second makes `android/app/build/outputs/bundle/release/app-release.aab` and needs the upload key
below. Needs `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`.
Raise `versionCode` in `android/app/build.gradle` (and the build number in Xcode) for every upload.

`npm run build` needs `VITE_AUDIO_BASE` in the environment (`set -a; source .env.local; set +a` locally),
or the audio check stops it.

## 3 · Upload key for Android (you, once, keep it forever)

```bash
keytool -genkeypair -v -keystore ~/sdah-hymnal-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then create `android/keystore.properties` (ignored by git):

```
storeFile=/Users/simplypheyie/sdah-hymnal-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

Back the .jks and its passwords up in your password manager. Play App Signing holds the real key; a lost
upload key can be reset through Play support, but it takes days.

## 4 · App Store Connect

- [ ] Paid Applications agreement, tax and banking done (Business → Agreements), or IAP won't load.
- [ ] New app: platform iOS, name (see blockers), primary language English (U.K.), bundle id
      `com.feyidesigns.sdahymnal` (register it first under Certificates, Identifiers & Profiles with
      In-App Purchase on), SKU `sdahymnal`.
- [ ] Monetization → In-App Purchases → three **Consumable** products from the table above. Each needs a
      display name, a description ("A thank-you to the builder. It unlocks nothing; every hymn is already
      free."), a price and a review screenshot of the tip jar (Settings → Tip jar).
      Add them to the first version's submission, or review rejects them later on their own.
- [ ] App Privacy: **Data Not Collected.** The app has no accounts, no analytics and no tracking;
      favourites and settings stay on the device. Purchases are handled by Apple.
      Privacy policy URL: `https://feyidesigns.com/apps/sdah-hymnal/privacy/` (add a line that the store
      apps send no page counts, and that tips are processed by Apple or Google).
- [ ] Age rating: 4+. Category: Music or Reference. Price: Free.
- [ ] Export compliance: answered in the build (`ITSAppUsesNonExemptEncryption` = NO).
- [ ] App Review notes: say it is a hymnal that works offline, with recordings, presenter mode and a TV
      screen; tips are optional consumables; attach or describe the rights permission. A thin web wrapper
      gets rejected under 4.2, so lead with what is native-feeling: offline texts, audio, presenter.
- [ ] Screenshots: 6.9" iPhone (1320×2868) required; 13" iPad only if iPad stays enabled.

## 5 · Google Play Console

- [ ] Developer account ($25 once). A **Personal** account must run a **closed test with at least
      12 testers opted in for 14 days in a row** before it can apply for production. An Organization
      account (needs a D-U-N-S number) skips this.
- [ ] Create the app: name (see blockers), App, Free, default language English (UK).
- [ ] Monetize → Products → In-app products: the three ids above, prices $0.99, $2.99, $4.99 (let Play
      convert local prices). Payments profile must be set up first.
- [ ] App content:
      - Data safety: **No data collected, no data shared.** (Play Billing purchases are Google's, not the app's.)
      - Ads: none. Target audience: all ages is fine, but "includes 13+" avoids Families policy extras.
      - Content rating questionnaire (IARC): reference/music, no user interaction.
      - Privacy policy URL as above. Government app: no. Financial features: none.
- [ ] Main store listing: short and full description, 512×512 icon, 1024×500 feature graphic (not made
      yet), at least two phone screenshots.

## 6 · Testing tracks

- [ ] Internal testing: upload the .aab, add yourself, install from the opt-in link, and give a tip with a
      licence tester account (Setup → License testing) so no money moves.
- [ ] Closed testing (personal account): 12+ testers opted in, installed, for 14 days in a row. Church
      members are the obvious group; send them the opt-in link and keep them installed the whole time.
      Then apply for production.
- [ ] iOS: TestFlight internal testing needs no review; external testers need a short beta review.

## Not done yet

- iOS and Android store screenshots, the Play feature graphic and listing copy.
- A run on a real phone of either platform.
- The checks named in section 0 (rights, name, R2 CORS).
