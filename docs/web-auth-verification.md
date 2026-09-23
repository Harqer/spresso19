# Web authentication

Use **https://get-spresso.web.app** for real Google and phone sign-in. The
Firebase project `get-spresso` authorizes that hostname and
`get-spresso.firebaseapp.com`; localhost is intentionally not authorized.
Firebase's web phone-auth guidance requires a hosted domain.

Firebase remains the identity provider. The browser retrieves a Firebase ID
token with `user.getIdToken(false)` (the SDK refreshes expired tokens), and the
Kotlin HTTP client sends it as `Authorization: Bearer ...` to
`https://woozy-anteater-572.convex.site`. Convex verifies issuer
`https://securetoken.google.com/get-spresso` and audience `get-spresso` using
`convex/auth.config.ts`. Do not substitute a Google OAuth access token or install
Convex Auth as a second identity system.

## September 23, 2026 repair

- Google popup closure on localhost: the hostname was absent from Firebase's
  authorized domains. Production Hosting is the selected sign-in environment.
- Phone sign-in: the callback was missing from the `App` → `AuthPage` wiring;
  the DOM had no reCAPTCHA host; asynchronous SMS errors escaped Kotlin's
  synchronous catch blocks. The bridge now owns the full phone flow, clears
  spent challenges, discards stale confirmations, and permits code correction.
- Startup: the Kotlin bundle could execute before the Firebase module finished
  loading. `bootstrap.js` now waits for Firebase and persisted session restoration.
- Hosting CSP blocked Firebase SDK modules, reCAPTCHA, and cross-origin API
  requests. The policy now allows the specific auth and Convex origins.
- Non-versioned JavaScript and Wasm URLs now revalidate instead of remaining
  immutable in the browser for a year.
- Live Firebase configuration was read back after enabling phone sign-in and
  setting `smsRegionConfig.allowlistOnly.allowedRegions` to `US` and `CA`.
  Google sign-in was already enabled. The Firebase CLI auth configuration does
  not provision phone sign-in or SMS region policy; preserve these separately
  in Firebase Authentication settings.
- SMS billing prerequisite: the project reported `billingEnabled: false`, and
  both visible billing accounts were closed. Real SMS delivery requires the
  owner to activate/link billing (Blaze); enabling the phone provider alone
  does not satisfy this prerequisite.

## Verification

```bash
node scripts/test/web-auth.test.mjs
node scripts/test/firebase-config.test.mjs
npx vitest run convex/identity.test.ts
./gradlew :composeApp:wasmJsBrowserDistribution --no-daemon --console=plain
```

Browser verification must check the built application, Google popup navigation,
and real reCAPTCHA rendering under the Hosting CSP. Test cancellation and failed
codes without claiming successful authentication. A full Google login and SMS
delivery/code confirmation still require a person controlling those credentials.

References: [Firebase Auth skill](https://github.com/firebase/agent-skills/blob/main/skills/firebase-auth-basics/SKILL.md),
[Firebase phone auth](https://firebase.google.com/docs/auth/web/phone-auth),
[Convex third-party OIDC](https://docs.convex.dev/auth/advanced/custom-auth).
