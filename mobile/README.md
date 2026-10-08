# Zavtoo mobile apps

Three Android and three iOS apps built from one Capacitor project. Each opens its part of the
live site, so website updates reach the apps without a new install.

| App | Opens | Package |
|---|---|---|
| Zavtoo | https://zavtoo.in/app | `in.zavtoo.customer` |
| Zavtoo Partner (technicians) | https://zavtoo.in/technician | `in.zavtoo.partner` |
| Zavtoo Dealer | https://zavtoo.in/dealer | `in.zavtoo.dealer` |

The start URLs are in `android/app/src/<flavor>/assets/capacitor.config.json`.

## Build

```sh
npm install
./build-apks.sh
```

APKs land in `dist/`. Bump `versionCode` / `versionName` in
`android/app/build.gradle` before each release you hand out.

**Signing:** release builds use `android/zavtoo-release.jks` with passwords in
`android/keystore.properties` (template: `keystore.properties.example`). Both
are git-ignored. Back them up — Android only installs an update over an
existing app when it's signed with the same key.

## iOS

One Xcode project (`ios/App`) builds all three apps. `ios/customer.xcconfig`,
`ios/partner.xcconfig` and `ios/dealer.xcconfig` set each app's bundle ID,
name, icon and start page (read by `ios/App/App/ZavtooViewController.swift`).

```sh
./build-ios.sh                                  # simulator builds → dist/ios-simulator/
DEVELOPMENT_TEAM=ABCDE12345 ./build-ios.sh      # signed .ipa files → dist/ios/
```

Installing on real iPhones needs an Apple Developer Program account: sign in
to it in Xcode (Settings → Accounts) and pass its team ID. The default export
is for App Store Connect / TestFlight; set `EXPORT_METHOD=ad-hoc` to install on
registered test devices instead. Opening `ios/App/App.xcodeproj` in Xcode
builds the customer app.
