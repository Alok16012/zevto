# Zavtoo mobile apps

One app — **Zavtoo** (`in.zavtoo.customer`) — for customers, technicians and dealers. It opens
https://zavtoo.in/app, which starts on a **Log in as Customer / Technician / Dealer** screen;
anyone already signed in goes straight into their part of the app. It loads the live site, so website updates
reach the app without a new install.

The older separate apps (Zavtoo Partner `in.zavtoo.partner` → /technician, Zavtoo Dealer
`in.zavtoo.dealer` → /dealer) can still be built from the same project, but aren't needed.

The start URLs are in `android/app/src/<flavor>/assets/capacitor.config.json`.

## Build

```sh
npm install
./build-apks.sh
```

The APK lands in `dist/Zavtoo.apk`. Bump `versionCode` / `versionName` in
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
