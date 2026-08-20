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

## 1. MANDATORY CONTEXT ACQUISITION (NEVER ASSUME)
1. **READ BEFORE YOU WRITE**: Before proposing or writing any code, you MUST use `grep_search` or `view_file` to locate the exact backend schema, API contract, or relevant files. NEVER assume you know how the backend works or hallucinate a schema. 
2. **FIND THE SOURCE OF TRUTH**: If you are working on UI and need data, find the exact `.gql` Data Connect schema, Postgres schema, or `routes.ts` file that provides that data first.

## 2. STRICT ZERO-MOCK PROTOCOL (POSITIVE DIRECTIVE)
1. **FAIL FAST ON MISSING DATA**: If you cannot find the actual backend schema, API endpoint, or data source for a feature, you MUST STOP. You are strictly forbidden from writing `delay()`, hardcoding placeholder arrays, or injecting mock data to make a UI "compile" or "look finished".
2. **EXPLICIT ERRORS ONLY**: If a backend call is unimplemented or missing, you must write `throw new Error("Missing Backend API - Needs Implementation")` or return standard HTTP 501 / RFC 7807 problem details. Do NOT catch errors silently and return empty lists. Do not fake success.
3. **HONEST & TRANSPARENT SYSTEM NOTICES**: If an API or live search fails at runtime, surface a clear error to the user (e.g. "Live product search is currently unavailable"). Never mask the error with fabricated dummy data.
## Event-Driven Error-Only CI Pipeline & No-Redundant-APK Rule (STRICT USER MANDATE)
1. **NO RECURRING SUCCESS NOTIFICATIONS OR POLLING**: The agent must NEVER poll or send periodic success status messages when GitHub Actions runs pass. Only engage when an actual failure occurs.
2. **ZERO LOCAL APK OVERHEAD**: Never invoke `./gradlew assembleDebug` or build `.apk` binaries locally unless the USER explicitly requests a build.




## Strict Prohibition of Developmental Bypasses & Local Setup Hacks (STRICT USER MANDATE)
1. **NO LOCAL SETUP OR DEV BYPASSES**: The codebase must remain in a production-ready state at all times. Never introduce or leave behind developmental bypasses such as `onDevLoginRequested`, `devOverrideUid`, or `token === "bypass"`/`"dummy"` authentication backdoors.
2. **PRODUCTION API KEY PRACTICES ONLY**: All API keys and environment variables must strictly follow production best practices (e.g., Vault-driven secrets or GCP Secret Manager). Developmental "quick starts" or local `.env` setup guidelines that compromise security are strictly forbidden.
3. **MANDATORY CLEANUP**: Any generated code meant for temporary local testing must be fully removed and replaced with actual production logic prior to completion.

## Proactive Best Practices & Skill Execution (MANDATORY RULE)
1. **PROACTIVE SKILL DISCOVERY**: Always proactively check for and utilize skills (e.g., `android-cli`, `navigation-3`, `jetpack-compose` rules) that are relevant to the active task, particularly for Jetpack Compose, System Architecture, and code execution.
2. **FOLLOW BEST PRACTICES UNCONDITIONALLY**: Never write "MVP", "quick hack", or non-standard code if it violates established enterprise best practices. If you are writing Jetpack Compose or System Design code, always apply the scalable, standard patterns from your skill guidelines and references first.

## Strict Prohibition of Automated Code Modification Scripts (MANDATORY RULE)
1. **MANUAL & RIGOROUS CHECKING ONLY**: When making codebase corrections, refactoring, or cleaning up unused imports/variables, NEVER write and execute generic, automated Python or shell scripts (e.g., regex scanners) to modify the codebase in bulk. Automated scripts are too broad and brittle for complex languages like Kotlin. 
2. **USE NATIVE LINTERS & MANUAL AUDITS**: Always do the rigorous work manually by relying on native compiler output, native linter warnings (e.g., `./gradlew lintDebug`), or language-aware tools, and manually verifying and applying the corrections yourself.
