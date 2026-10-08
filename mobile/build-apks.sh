#!/bin/sh
# Builds the three signed release APKs into mobile/dist/.
# Needs JDK 21, the Android SDK, and android/keystore.properties + the .jks file.
set -e
cd "$(dirname "$0")"
export JAVA_HOME="${JAVA_HOME:-$HOME/Library/Java/jdk-21.0.12+8/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
# The Capacitor CLI needs Node 22+.
npx -y node@22 node_modules/@capacitor/cli/bin/capacitor sync android
(cd android && ./gradlew assembleCustomerRelease assemblePartnerRelease assembleDealerRelease)
mkdir -p dist
cp android/app/build/outputs/apk/customer/release/app-customer-release.apk dist/Zavtoo-Customer.apk
cp android/app/build/outputs/apk/partner/release/app-partner-release.apk dist/Zavtoo-Partner-Technician.apk
cp android/app/build/outputs/apk/dealer/release/app-dealer-release.apk dist/Zavtoo-Dealer.apk
ls -lh dist
