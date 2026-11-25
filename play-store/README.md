# Zavtoo Play Store submission kit

Prepared 15 October 2026 for **Zavtoo**, package `in.zavtoo.customer`, with customer, technician and dealer roles. This folder prepares the release; it is not a published Play Store submission.

## Upload assets

| File | Use |
| --- | --- |
| `assets/app-icon-512.png` | 512 × 512 opaque PNG store icon, official existing brand mark |
| `assets/feature-graphic-1024x500.png` | 1024 × 500 opaque PNG feature graphic — upload this export |
| `assets/feature-graphic.png` | Larger original AI-generated banner, keep as source |
| `screenshots/*.jpg` | Real mobile web-app captures from zavtoo.in; see screenshot notes |
| `listing-en-IN.txt` | English (India) app name, short and full descriptions |
| `release-notes-en-IN.txt` | First release notes |
| `data-safety.md` | Code-based Data Safety form draft and verification items |
| `app-access.md` | Reviewer instructions and account requirements |
| `privacy-policy.md` | Readable copy of the updated privacy policy |

The banner's purifier is an illustrative marketing visual, not a promise of a particular product model. Existing logo assets supply the icon. Built-in image_gen supplied the banner; prompt recorded in `image-prompts.txt`.

Google's [asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en) specify a 512 × 512 store icon and 1024 × 500 feature graphic. Supply at least two actual app screenshots; four 1080 × 1920 captures of core functionality are recommended for richer placements. The included pre-login screenshots are supplementary and should be expanded with signed-in screens after test accounts are available.

## Website changes prepared locally

- `/privacy-policy`: rewritten around actual account, photo, role, location and support data flows.
- `/delete-account`: public email-based deletion request page requiring no login.
- Customer, technician and dealer profiles: Privacy policy, Terms and Delete account links. Customer auth also exposes these links.
- Website footer and sitemap include deletion navigation.

Deploy the reviewed web changes to the domain the app loads. Then check that `https://zavtoo.in/privacy-policy` and `https://zavtoo.in/delete-account` load publicly without authentication or a geographical restriction. Local changes are **not live** yet. Google's [deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) call for both an in-app pathway and a web pathway. The request page uses a real mailto link and clearly asks users to send the email; it does not pretend a request was submitted. Support must actually carry out verified requests, remove associated private/public storage files as applicable, and document any retained records and periods. Confirm operational retention periods before submission.

## Build and signing

The Android project already targets SDK 36, meeting the [current phone app target requirement](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en). JDK 21 is available through Homebrew (`/opt/homebrew/opt/openjdk@21/bin/java`), but `mobile/android/keystore.properties` is missing, so **no signed AAB was built**. macOS `java_home` did not locate it automatically; configure the Homebrew JDK explicitly if needed.

1. Configure JDK 21 (`JAVA_HOME`, for Homebrew typically `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`) and Android SDK 36 (`ANDROID_HOME`, typically `$HOME/Library/Android/sdk`).
2. Install mobile dependencies from `mobile/package.json` if needed. Keep the flavor's existing Capacitor config: it opens `https://zavtoo.in/app`.
3. Configure `mobile/android/keystore.properties` with the existing release/upload key; never commit keys or passwords.
4. Check the app's `versionCode` is higher than every previous Play upload (currently 1). Confirm final application ID before the first upload.
5. Run `cd mobile && ./build-play-store.sh`. Output: `mobile/dist/Zavtoo.aab`.
6. Enable Play App Signing, upload the AAB to Internal testing, inspect validation/pre-launch reports and verify any native-library page-size warnings against the final bundle.

## Console checklist

- [ ] Developer identity, organization verification/D-U-N-S where applicable, contact details and public developer profile completed using real owner information.
- [ ] Create app: free app, English (India), app name from listing. Category suggestion: Shopping; choose tags actually available in Console.
- [ ] Store listing: descriptions, icon, feature graphic, real screenshots, website and support email. Contact currently in code: `Paanifilter9@gmail.com`; owner must confirm it is monitored.
- [ ] App content: Privacy Policy URL; Data Safety based on all roles; Ads proposed No; adult target audience (18+); complete IARC content-rating questionnaire truthfully, including support messages/reviews/listings. Do not invent a final rating.
- [ ] Complete any additional declarations Console presents (for example financial features or health declarations). RO shopping is not a medical app; wallet/earnings records still need an accurate financial-feature assessment.
- [ ] App access: provide working customer, verified technician and verified dealer review accounts securely in Console.
- [ ] Test email deletion intake and documented manual data deletion, including uploaded photos and records retained for legitimate reasons.
- [ ] Signed AAB uploaded, signing validated, internal test passed: signup/login/reset, role switch, purchases/booking, support attachments, permissions allow/deny, location start/stop, offline/back navigation and deletion links.
- [ ] Check live site's features match listing and screenshots. The reviewed live site is older than the local code (role switch not yet visible in customer login).
- [ ] Country distribution and pricing confirmed by owner. Paid physical goods/services in the app differ from charging for the app itself.
- [ ] If applicable, complete required closed testing and production access. [New personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) may need at least 12 continuously opted-in testers for 14 days.
- [ ] Resolve pre-launch report and policy issues, supply release notes and submit to review.

No account access, reviewer credentials, billing, business verification, deployment or publication was performed. Those depend on the owner's account and real operational details. Do not mark the release ready until these boxes are verified.

## Validation performed

- `npx tsc --noEmit`: passed after the web changes.
- `sh -n mobile/build-play-store.sh`: passed. Build script correctly stops when signing config is absent.
- `npm run build`: blocked by network access to Google Fonts (Poppins download), not a reported TypeScript error. Full production build remains unverified.
- Local preview server could not bind a port under the current sandbox, so new policy/deletion page visual QA remains pending.
- Asset metadata checked; icon 512 × 512 PNG and feature graphic 1024 × 500 RGB PNG. Four 360 × 640 JPEG app screenshots meet minimum dimensions and aspect ratio; these are not the recommended 1080px core-feature captures. Screenshots and icon were visually inspected.
