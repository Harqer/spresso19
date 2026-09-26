# Nested skills and platform guidance

Use specialist skills only when their procedure matches this architecture.

## Required Convex skills when available

### `convex:convex-expert`
Load before writing/editing any `convex/` file. Key expectations:
- read `convex/schema.ts` first;
- object-form functions with `args` and `returns`;
- public functions authenticate and enforce ownership;
- internal helpers default to `internal*`;
- indexes instead of table-scan `.filter()`;
- bounded reads; no unbounded `.collect()`;
- `"use node"` only in action-only modules;
- external APIs in actions; persist through internal mutations;
- verify with TypeScript and a Convex push/test.

### `convex:convex-reviewer`
Load after a phase changes Convex code and before writing the DONE marker. Review auth/authz, validators, public surface, indexes, pagination/bounds, contention, internal/public function choice, and schema evolution.

If these skills are unavailable, follow the above rules explicitly and treat the review checklist as mandatory.

## Playwright skill

Microsoft publishes agent skills with `playwright-cli`:

```bash
playwright-cli install --skills=agents
```

Use the installed `playwright-cli` skill for locator, waiting, session, tracing, and Playwright testing guidance when available. It is advisory: the production runtime remains `playwright-core` connected to Browserbase, not Playwright MCP/CLI.

Fallback implementation rules:
- semantic locators first: `getByRole`, `getByLabel`, `getByText`;
- rely on Playwright actionability/auto-waiting;
- arm response/popup/download waiters before triggering the action;
- after navigation/SPA route changes/handoff, reacquire observations;
- verify write postconditions before reporting success;
- a timeout after a write is `OUTCOME_UNKNOWN`, not automatic failure/retry.

## Browserbase skills

Browserbase publishes `browserbase/skills`. The `browserbase-cli` skill is relevant for inspecting platform sessions/debug URLs/functions and may be installed with:

```bash
npx skills add browserbase/skills --skill browserbase-cli
```

Do not use Browserbase's `browser` or `safe-browser` skill as the production architecture: those skills target the `browse` CLI / Claude Agent SDK and can constrain/replace the direct Convex -> Playwright SDK path. They are useful references, not nested runtime requirements.

Fallback Browserbase contract:
- use `@browserbasehq/sdk`;
- one session per merchant workflow;
- `sessions.create`, `sessions.retrieve`, `sessions.debug`, `sessions.update`;
- use the returned CDP `connectUrl` only in memory;
- Live View/debug URL is short-lived sensitive session access;
- release/destroy session at workflow end;
- no Browserbase Context persistence in this pass.

## Kotlin / AGP 9 / KMP skill

JetBrains publishes `kotlin-tooling-agp9-migration`:

```bash
npx skills add Kotlin/kotlin-agent-skills --skill kotlin-tooling-agp9-migration
```

Load it in Phase 3 only if Gradle/module topology must change or AGP 9 compatibility fails. Do not restructure a working AGP 9 KMP project merely because the skill contains a migration path.

Fallback KMP/Compose contract:
- inspect `settings.gradle.kts`, root/version catalog, module build files, and source-set layout first;
- preserve existing KMP module boundaries when AGP 9 is already valid;
- shared state/contracts belong in `commonMain` where platform-independent;
- Android-only Live View/WebView/Custom Tab handling belongs in `androidMain` behind `expect/actual` or a platform interface;
- use `viewModelScope`, structured concurrency, `StateFlow`/immutable UI state;
- never put secrets in `SavedStateHandle`, logs, analytics, navigation arguments, or persisted Compose state;
- keep Firebase Auth boundary unchanged unless repository evidence proves a defect;
- verify with the repository's Gradle wrapper, Android lint, unit tests, and relevant KMP compilation targets.

## AP2/UCP

No production-ready AP2 implementation skill was found that should replace the protocol specs. Phase 5 therefore contains the exact required negotiation and verification contract and must use current UCP/AP2 primary specifications.

## Noodle

Noodle discovers project skills from `.agents/skills` and treats a skill with `schedule:` frontmatter as schedulable. This bundle encodes dependencies in each phase's schedule and uses merged DONE/BLOCKED markers as deterministic gates.
