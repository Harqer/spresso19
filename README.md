# Spresso

Spresso is a conversational commerce assistant that can discover products, understand camera input, manage groceries, wardrobe, travel and orders, and complete purchases only after explicit user confirmation. The primary client is the Kotlin Multiplatform Android application; the React/Vite client at the repository root is a companion surface and is not the Android release entry point.

## Environment status

Firebase and Google Cloud CLI verification on 24 August 2026 confirmed the project below:

- Project ID and display name: `get-spresso`
- Project number: `426485634252`
- Default Hosting site: `https://get-spresso.web.app`
- Android Firebase app: legacy application ID `com.spresso19` (`1:426485634252:android:cdddac79a46c96aaef5e69`); the product name remains **Spresso**
- Web Firebase app: `1:426485634252:web:dd38d5a9ead1b9f4ef5e69`
- Firestore: Standard, Native mode, `(default)`, `nam5`, delete protection enabled

The Hosting origin currently returns HTTP 404 because no Hosting release has been deployed. Firebase Authentication is initialized with Google, email/password and anonymous sign-in; phone sign-in remains disabled pending an explicit SMS region/abuse-control policy. Cloud Functions, Cloud Run, App Check, Vertex AI, Gemini API and Secret Manager APIs are disabled, and no Cloud Storage bucket was found. References to `spresso-5561f` and `spresso-19` are legacy configuration—not live environments.

The repository default Firebase alias and active Google Cloud CLI project are `get-spresso`. Agents must still verify each individual service before claiming it is provisioned; project existence does not imply that Functions, Storage, App Check, secrets or deployed endpoints exist.

## Target architecture

The launch architecture is Firebase-first and does not require a relational operational database:

- Firebase Authentication and App Check establish client identity and request integrity.
- Cloud Firestore is the primary application store for profiles, preferences, carts, conversations, saved items, purchase attempts, order/receipt state and webhook deduplication.
- Cloud Functions v2 owns privileged writes, AI tool execution, payment-intent creation, webhook verification and fulfillment orchestration.
- Stripe remains the financial system of record. Spresso stores processor references and customer-facing order state, never card data or an independent financial ledger.
- Spresso does not own inventory. Merchant availability and price are verified through trusted provider data at checkout; application records must not reserve or decrement retailer stock.
- Cloud Storage holds user-authorized media and receipt assets under explicit retention rules.
- Product discovery uses retailer/search providers and may cache normalized results in Firestore. Firestore is not assumed to provide full catalog search unless the selected edition and indexes explicitly support it.

Data Connect/PostgreSQL, Cloud SQL and Redis artifacts in this repository are legacy or exploratory. Spanner remains the approved global-catalog boundary and Cloud Run remains the approved tool-server/provider boundary; their configuration is not evidence that those services are deployed. Provision each deliberately in `get-spresso` only after API, IAM, image, secret and cost verification.

## Product language and interface rules

- Write like a helpful general assistant with familiar shopping language: cart, checkout, order, delivery, return and refund.
- Preserve explicit human confirmation before every purchase. Never turn a prediction, biometric prompt or payment-sheet dismissal into a successful order.
- The phone and web clients use Material 3 icons, components and semantic color roles.
- Meta Wearables display surfaces do **not** use Material 3. They must use the Meta DAT Display DSL and the lifecycle, permission and typography guidance required by `AGENTS.md`.
- The only badge-style status treatment permitted is a real purchase confirmation backed by the completed server response. Other state is presented as ordinary text, icons or actions.

## Repository map

| Path | Purpose |
| --- | --- |
| `composeApp/` | Kotlin Multiplatform application and Android integration |
| `composeApp/src/androidMain/` | Android, Meta DAT, Google Pay, App Functions and platform services |
| `composeApp/src/commonMain/` | Shared Material 3 UI, models and feature logic |
| `src/` | React/Vite companion client |
| `functions/` | Firebase callable functions, Genkit flows, payments and fulfillment |
| `dataconnect/` | Legacy relational experiment; not a launch dependency |
| `terraform/` | Hand-authored Google Cloud definitions for the approved Spanner global-catalog and Cloud Run tool-server boundaries, plus supporting networking, IAM, API and Secret Manager resources. These definitions are not proof of deployment and must only be applied to the verified `get-spresso` project after per-service checks. |
| `.github/workflows/` | CI and release validation |

Read [`AGENTS.md`](AGENTS.md) before changing code. It contains the mandatory DAT documentation gate and repository-specific validation rules.

## Local development

Prerequisites are Node.js, npm, JDK 17, the Android SDK and Firebase CLI credentials for the intended environment. Keep secrets out of source control; release values are supplied by CI or Google Secret Manager.

```bash
npm ci
npm run lint
npm run build

cd functions
npm ci
npm run build
```

For Android checks, use the checked-in Gradle wrapper and JDK 17:

```bash
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew :composeApp:compileDebugKotlinAndroid
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew :composeApp:lintDebug
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew :composeApp:testDebugUnitTest
```

Do not produce an APK as a routine validation step. Release bundles must be built through the release workflow with signing and production configuration supplied by the deployment environment.

## Meta Wearables development

Before editing wearable code, use the DAT MCP documentation tools when available or the installed `mwdat-android` skills listed in `AGENTS.md`. Validate registration, permission denial, session pause/resume, device disconnect, display attachment and camera teardown with MockDeviceKit. Use the live DAT Inspector for device-only issues.

## Production configuration

After the exact cloud project is deliberately created and recorded, the application expects Firebase configuration, App Check providers, Stripe publishable and secret keys, Google Wallet issuer credentials, Gemini credentials and fulfillment-provider credentials to be provisioned outside the repository. Callable functions that access private data or mutate state require both authentication and App Check. Payment amounts are calculated from a trusted server-side merchant quote; the client never chooses the amount.

Before an App Store or Play Store submission, complete the external release checklist: production signing, privacy/data-safety declarations, account-deletion verification, reviewer access, Secret Manager bindings, key-rotation coordination, crash/ANR review and physical-device DAT validation.

## Current audit

The production-readiness review is maintained at [`.lavish/spresso-production-readiness-audit.html`](.lavish/spresso-production-readiness-audit.html). It distinguishes code issues from external console or credential work so a passing build is not mistaken for store readiness.
