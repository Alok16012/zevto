#!/bin/sh
# Builds the signed release APK of the Zavtoo app into mobile/dist/.
# One app for everyone: customers, technicians and dealers pick who they are on the
# login screen. (The old separate Partner/Dealer flavors still exist:
# ./gradlew assemblePartnerRelease assembleDealerRelease.)
# Needs JDK 21, the Android SDK, and android/keystore.properties + the .jks file.
set -e
cd "$(dirname "$0")"
export JAVA_HOME="${JAVA_HOME:-$HOME/Library/Java/jdk-21.0.12+8/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
# The Capacitor CLI needs Node 22+.
npx -y node@22 node_modules/@capacitor/cli/bin/capacitor sync android
(cd android && ./gradlew assembleCustomerRelease)
mkdir -p dist
cp android/app/build/outputs/apk/customer/release/app-customer-release.apk dist/Zavtoo.apk
ls -lh dist
