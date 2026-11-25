# Zavtoo — Data Safety preparation

Code review: 15 October 2026. This is a draft for the single `in.zavtoo.customer` app, including Customer, Technician and Dealer roles. Complete the Console form against the deployed site and final AAB. The current live site is older than the local code; deploy and verify the changes before submission.

The app **collects user data**. Do not select “no data collected”. Supabase handles authentication, database, realtime updates and files. Local storage holds sessions, cart, onboarding and role selection. No ad SDK or analytics SDK was found in the reviewed app code. Infrastructure log practices still need owner confirmation.

| Play data category | Evidence and purpose | Required/optional | Sharing review |
| --- | --- | --- | --- |
| Personal info: name, email, phone, user IDs | Login/profile, dispatch, business accounts; account management and app functionality | Login/account fields required; role-specific fields vary | Assigned dealers/technicians receive relevant customer details. Assess their independent role; do not assume all sharing is exempt. |
| Personal info: address | Service and delivery addresses; app functionality | Required for orders/jobs, optional until used | Assigned technicians/dealers and fulfilment recipients |
| Personal info: other info | Optional DOB/gender; dealer GSTIN, technician skills, languages and experience | Optional/role-dependent | Technician/public shop profile fields are visible to others; optional customer DOB/gender is private account data |
| Location: precise, approximate where applicable | Saved service coordinates, technician `watchPosition`, `tech_locations`; app functionality | Feature-dependent, permission-controlled; manual addresses available | Active ride coordinates shown to assigned customer and relevant operations; map area sent to map tile provider |
| Photos and videos: photos | RO photos, chat attachments, technician avatar, listings; app functionality | Optional/user initiated | Relevant service staff can view RO photos; avatars and listing images use public URLs |
| Messages: other in-app messages | Customer support chat; app functionality | Optional | Authorized support staff; review any external support processing |
| Financial info: purchase history | Orders, service charges, purchased parts; app functionality | Required when purchasing | Relevant dealer/fulfilment and authorized staff |
| Financial info: other financial info | Wallet transactions, earnings, payout and settlement records; app functionality | Role/transaction-dependent | Relevant business participants and authorized staff |
| App activity: other user-generated content | Reviews/ratings, service notes, listings; app functionality | Optional/role-dependent | Reviews and listings may be public |

DOB/gender/GSTIN mapping should be checked against the exact current form's definitions. An Android permission alone is not proof that data is collected; this table also traces web requests and stored records.

## Form decisions

- Ads: proposed “No” based on reviewed code; check deployed web scripts first.
- Account creation: email/password; customer, technician and dealer signup flows exist.
- Deletion URL after deployment: `https://zavtoo.in/delete-account`.
- In-app deletion path after deployment: Profile → Delete account → email request. Manual support processing, not instant automatic erasure. Confirm the mailbox is monitored and ownership checks and deletion operations work before stating this is supported.
- Data transmitted over HTTPS: app server and configured API/map URLs use HTTPS. Verify the release AAB's endpoints, redirects, third-party resources and production configuration before answering the universal encryption question.
- Purposes: app functionality and account management. Add fraud prevention/security only for data actually used that way. Do not select advertising or analytics without a real implementation.
- Uploaded records are retained on the server: generally **not ephemeral**. Check network-only map/log information separately.
- Required/optional: answer for the specific data flow; a voluntarily started feature can still need data to function. Check each role.
- “Shared” has specific Google exemptions for processors and explicit user-directed transfers. Supabase acting only on Zavtoo's behalf may be a processor exemption; independent dealers, public listings and map providers require separate assessment.
- Device IDs, diagnostics, web browsing and app interactions: no dedicated tracking code found. Confirm hosting, auth logs and any production-injected scripts before concluding they are absent. Network IP receipt is described in the policy; do not invent IP-derived location collection.

## Owner checks before the final declaration

Confirm exact hosting provider, infrastructure logs and backup retention; legal/business identity and contact inbox; any offline payment processing providers; whether fulfilment partners independently use data; and the periods for retained invoices, settlements, disputes and backups. The policy avoids claiming unverified certifications, named payment gateways, call recording, a fixed legal retention period or Google Analytics.

Source: [Google Data Safety form guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
