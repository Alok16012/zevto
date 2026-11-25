#!/bin/sh
# Build the signed customer app Android App Bundle for Google Play.
# JDK 21, Android SDK 36, installed mobile dependencies and release signing required.
set -eu
cd "$(dirname "$0")"
if ! command -v java >/dev/null 2>&1 || ! java -version >/dev/null 2>&1; then
  echo 'JDK 21 is required. Install it and set JAVA_HOME before running this script.' >&2
  exit 1
fi
if [ ! -f android/keystore.properties ]; then
  echo 'Configure android/keystore.properties using the existing release/upload key first.' >&2
  exit 1
fi
# Avoid changing Capacitor assets: existing flavor start URL is retained.
(cd android && ./gradlew bundleCustomerRelease)
mkdir -p dist
cp android/app/build/outputs/bundle/customerRelease/app-customer-release.aab dist/Zavtoo.aab
echo 'Ready: mobile/dist/Zavtoo.aab'
