# Workspace Rules

## Persistent Context Memory

The user prefers an agent that retains long-term memory of this specific architecture (Spresso19, Kotlin Multiplatform, Google Cloud, Firebase Data Connect, Gemini Live WebSockets) so they do not have to repeatedly explain the context.

To achieve this, ALWAYS leverage the principles of **Recursive Language Models (RLMs)** to externalize context:

1. **Self-Documentation (Context Engineering Pipeline)**: Always document architectural decisions, schema states, and current UI layouts into markdown artifacts within the workspace context (e.g., maintaining an updated `architecture_context.md`, `schema.md`, or similar). 
2. **Proactive Reading**: When beginning a new task, use your tools (like `view_file` or `grep_search`) to aggressively read the existing codebase and these generated context documents *before* asking the user for clarification.
3. **Hermes / Context Retention**: By reading the local `.md` artifacts and project config files proactively, you simulate a persistent memory state (Hermes/RLM paradigm). Treat the file system as your extended context window.

Whenever the user asks a question about the project, assume the answer is already in the codebase or the generated artifacts, and use your tools to find it.

## Persistent Architecture Context
An architecture context document has been copied to the project at `spresso19/docs/spresso19_architecture_context.md`. When waking up for a new session or encountering ambiguity about the stack, always read this file first.

## UI Badge & Overstatement Elimination Standard (STRICT USER MANDATE)
1. **ONLY Product & Restaurant Star Ratings Allowed**: The ONLY visual rating badges allowed in the UI are standard customer product / restaurant star ratings (`★ 4.8`).
2. **NO Artificial Telemetry Badges**: DO NOT render artificial percentage match scores (`98% Match`), elevation badges (`Elevated`), grounding badges (`✓ Google Search Grounded`), or engineering status labels.
3. **Rationale**: Users do not care about internal AI match percentage scores or technical telemetry badges (no top consumer app like TikTok, Instagram, or Amazon overlays match percentages on recommendations). It clutters the interface and overstates obvious system actions. Clean, elegant UI with smooth motion and direct content results is mandatory.

## App Immersion & Backend Hiding Standard (NO BREAKING IMMERSION)
1. **Never Expose Internal Technical Names in the UI**: The user interface must remain fully immersive and consumer-focused. Never display internal backend technologies, framework names, or infrastructure details (such as "Kitesurf", "Cloudflare", "CDP", "PostgreSQL", or "Data Connect") in buttons, helper texts, log widgets, or user-facing messages.
2. **Abstract Automated Actions**: Keep automated backend pipelines invisible. Frame headless edge browser checkouts or catalog updates using standard, clean actions (e.g., "Add to Cart", "Confirm Order", or "Order Processing") rather than describing the underlying execution nodes or steps.
3. **No Redundant UI Additions**: The UI structure is frozen and complete. Do not inject debug outputs, execution trackers, or buttons that break the clean, premium styling of the application.

## Strict No Emojis & Enterprise Vector Icon Standard (MANDATORY USER RULE)
1. **STRICTLY NO EMOJIS IN UI**: Never use raw Unicode emoji characters for UI buttons, tabs, labels, actions, or status indicators across any codebase, repository, or frontend app (Android, Web, iOS, React, Flutter, etc.).
2. **ENTERPRISE VECTOR ICONS ONLY**: Always use official enterprise design system vector icons (such as Material 3 Icons (`androidx.compose.material.icons.Icons`), Lucide React icons (`lucide-react`), or Material Symbols) for all visual icons.

## Production Fallback & Zero-Mock Integrity Standard (STRICT USER MANDATE)
1. **NO SILENT DUMMY DATA OR FABRICATED PRODUCTS**: When live web search, scrapers, AI models, or backend APIs fail or encounter missing metadata, NEVER inject silent mock products, fake placeholder images, or hallucinated payment confirmations.
2. **HONEST & TRANSPARENT SYSTEM NOTICES**: Return clear, honest system responses or standard error statuses (e.g. "Live product search is currently unavailable" or "Item temporarily out of stock") so the user is never misled by fake data.
3. **RESILIENCE & FAIL-FAST**: Follow production RFC 7807 problem details or circuit-breaker patterns rather than disguising API errors as successful dummy transactions.
## Event-Driven Error-Only CI Pipeline & No-Redundant-APK Rule (STRICT USER MANDATE)
1. **NO RECURRING SUCCESS NOTIFICATIONS OR POLLING**: The agent must NEVER poll or send periodic success status messages when GitHub Actions runs pass. Only engage when an actual failure occurs.
2. **ZERO LOCAL APK OVERHEAD**: Never invoke `./gradlew assembleDebug` or build `.apk` binaries locally unless the USER explicitly requests a build.



