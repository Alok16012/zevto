#!/bin/sh
# Builds the three iOS apps (customer, partner, dealer).
#
#   ./build-ios.sh                      → simulator builds in dist/ios-simulator/
#   DEVELOPMENT_TEAM=ABCDE12345 ./build-ios.sh
#                                       → signed .ipa files in dist/ios/ for TestFlight / App Store
#
# Needs Xcode. Signing needs an Apple Developer account signed in to Xcode
# (Settings → Accounts); the team ID is on developer.apple.com → Membership.
set -e
cd "$(dirname "$0")"
npx -y node@22 node_modules/@capacitor/cli/bin/capacitor sync ios
PROJECT=ios/App/App.xcodeproj
BUILD=ios/App/build

for APP in customer partner dealer; do
  CONFIG="ios/$APP.xcconfig"
  if [ -n "$DEVELOPMENT_TEAM" ]; then
    xcodebuild -project "$PROJECT" -scheme App -configuration Release -xcconfig "$CONFIG" \
      -destination "generic/platform=iOS" -archivePath "$BUILD/$APP.xcarchive" \
      DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates archive
    cat > "$BUILD/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>${EXPORT_METHOD:-app-store-connect}</string>
  <key>teamID</key><string>$DEVELOPMENT_TEAM</string>
  <key>signingStyle</key><string>automatic</string>
</dict></plist>
PLIST
    xcodebuild -exportArchive -archivePath "$BUILD/$APP.xcarchive" -exportPath "dist/ios/$APP" \
      -exportOptionsPlist "$BUILD/ExportOptions.plist" -allowProvisioningUpdates
  else
    xcodebuild -project "$PROJECT" -scheme App -configuration Release -xcconfig "$CONFIG" \
      -sdk iphonesimulator -destination "generic/platform=iOS Simulator" \
      -derivedDataPath "$BUILD/$APP" CODE_SIGNING_ALLOWED=NO build
    mkdir -p dist/ios-simulator
    rm -rf "dist/ios-simulator/$APP.app"
    cp -R "$BUILD/$APP/Build/Products/Release-iphonesimulator/App.app" "dist/ios-simulator/$APP.app"
  fi
done
ls dist/ios* 
