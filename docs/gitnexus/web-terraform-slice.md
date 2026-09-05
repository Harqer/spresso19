# GitNexus remediation inventory: React/Vite and Terraform

Date: 2026-09-04  
Scope: `src/**`, root web/package/Vite configuration, `terraform/**`, and this report.

This is an inventory only. It does not authorize deleting the React client,
removing Terraform resources, or changing the service boundary. The current
working tree is shared and already contains unrelated changes, so this report
records ownership before the lanes are split into isolated commits.

## Ownership and classification

| Area | Canonical source | Classification | Notes and next owner |
| --- | --- | --- | --- |
| Web application | `src/App.tsx`, `src/main.tsx`, `src/components/**`, `src/routes/**`, `src/hooks/**`, `src/lib/**`, `src/types.ts`, `src/theme.ts`, `src/index.css` | React/Vite companion source | Keep frozen as a behavior/parity reference while Android stage one is implemented. Do not create a second implementation of an Android screen in this lane. |
| Web tests | `src/test/**` | Hand-authored test source | Run with the root Node/TypeScript test commands; classify each test by backend contract before moving it. |
| Data Connect client | `src/dataconnect/**` | Generated SDK plus checked-in generated guide/README | Treat `src/dataconnect/esm/**` and generated operation files as generated artifacts. Do not hand-edit them. The Data Connect path is legacy/exploratory for launch and must not silently become a second source of truth. |
| Web database adapters | `src/db/**` | Server-side/legacy web adapter | `src/db/index.ts` defaults to the stale `spresso-5561f` Cloud SQL connection name. It is not a valid launch default and must be moved behind an explicit legacy adapter boundary or removed only in a separate approved migration. |
| Firebase web adapter | `src/lib/firebase.ts` | Active-looking web source with legacy coupling | Initializes Firestore, Realtime Database, and Data Connect together. Ownership must be made explicit: Firestore owns user-scoped state; discovery provider/Spanner owns global catalog; Data Connect is not an implicit fallback. |
| Root config | `package.json`, `package-lock.json`, `vite.config.ts`, `index.html`, `src/vite-env.d.ts`, `tsconfig*.json` | Hand-authored build/config source | `package.json` still points `dev` at `server.ts` and `start` at `dist/server.cjs`; verify those runtime files before treating the web scripts as release-ready. `vite.config.ts` changes are build-policy changes and need a dedicated web commit. |
| Terraform | `terraform/provider.tf`, `terraform/variables.tf`, `terraform/main.tf`, `terraform/outputs.tf` | Hand-authored infrastructure source | Current intended boundary is Google APIs, networking, Secret Manager, Spanner global catalog, Cloud Run tool server, and Agent Engine staging. It does not manage Firebase Hosting, Functions, Firestore, Storage, or App Check. Apply only after per-service verification in `get-spresso`. |
| Terraform plan | `terraform/tfplan` | Generated/binary artifact | Do not review or commit as source. It was produced by a different Terraform version according to the existing audit and is not a portable source of truth. Regenerate a saved plan from a pinned toolchain after backend/state policy is established. |

The current scoped working tree contains 63 modified/deleted tracked files in
the broader web/config/docs view and several untracked reports and generated
candidates. It is not a meaningful single web commit: most component changes
are unrelated formatting or UI edits, while `package.json`, `vite.config.ts`,
and Terraform alter build and infrastructure behavior.

## Boundary findings

1. The canonical environment is `get-spresso` (project number
   `426485634252`). References to `spresso-5561f` and `spresso-19` are stale.
   The Cloud SQL fallback in `src/db/index.ts` therefore violates the verified
   environment rule unless an explicit, non-production legacy configuration is
   supplied.
2. The launch architecture is Firestore-first for user state. Product results
   are discovery/listing metadata and may be cached; no web or Terraform lane
   may add stock, reservations, decrements, or a local inventory system.
3. Spanner and Cloud Run remain approved boundaries, not proof of deployment.
   Terraform currently provisions their resources but lacks Firebase service
   resources and does not prove that the referenced image, APIs, secrets, IAM,
   or endpoints exist.
4. The README previously had two contradictory `terraform/` table rows, one
   calling the directory approved and one calling it legacy. The directory is
   retained and the README now describes its actual approved Google boundaries;
   this documentation correction does not imply that those services are live.
5. The web tree and KMP Wasm tree are two client surfaces. GitNexus can report
   ambiguous names across Kotlin and TypeScript (for example `App`); all future
   impact queries must use the file-qualified symbol or target UID.

## GitNexus evidence and ambiguity

The refreshed index contains cross-language and generated-file edges. A query
for “React Vite Firebase Data Connect Terraform Cloud Run Spanner” returned
both active `src/**` symbols and generated `functions/lib/**` symbols, as well
as `README.md` and architecture/audit documents. This is useful for discovery
but means a name-only query is unsafe for edits.

Known ambiguity/risk cases:

- `App` resolves to both Kotlin `composeApp/src/commonMain/kotlin/App.kt` and
  TypeScript `src/App.tsx`; use a file-qualified target.
- `spanner`, `data_connect`, and provider names occur in TypeScript source,
  generated JavaScript, Terraform, and documentation; generated output must
  not be treated as an independent implementation.
- `inventory` appears in UI copy and component examples in addition to backend
  code. Before removing or renaming it, distinguish user-facing comparison
  language from forbidden owned-inventory semantics.
- Current `detect-changes --scope all` is critical because the shared tree has
  hundreds of unrelated dirty paths and reports 122 affected processes. That
  result is a workspace baseline, not a web/Terraform-specific regression
  verdict.

## Proposed isolated commits

1. `chore: checkpoint web and terraform inventory` — manifest and report only;
   no behavior changes.
2. `build(web): make React/Vite scripts and runtime entrypoints truthful` —
   resolve `dev`/`start` entrypoint reality, package lock, Vite manifest and
   chunk policy; verify TypeScript, build, and bundle budget.
3. `refactor(web): isolate legacy Data Connect and Cloud SQL adapters` — only
   after caller impact analysis and explicit contract tests; no dual writes and
   no inventory behavior.
4. `chore(terraform): reconcile approved Google Cloud boundaries` — pin
   Terraform/provider versions, require explicit project/image inputs, align
   Spanner names with consumers, and document omitted Firebase resources. Do
   not apply from this lane.
5. `docs: remove architecture contradictions and record service inventory` —
   keep the corrected README Terraform description aligned with verified service
   evidence before any infrastructure apply.

Each commit should be created only after the previous one is checkpointed and
the lane's file set is clean. Do not use `git reset`, `git clean`, or broad
deletion to achieve that state.

## Verification commands for this lane

Read-only baseline:

```bash
git status --short -- src package.json package-lock.json vite.config.ts terraform docs
git diff --stat -- src package.json package-lock.json vite.config.ts terraform docs
```

Web checks after web-source changes:

```bash
npx tsc --noEmit --pretty false
npm run build
npm run test:smoke
npm run test:contracts
npm run test:bundle-budget
```

Terraform checks after Terraform-source changes:

```bash
terraform fmt -check -recursive terraform
terraform -chdir=terraform init -backend=false
terraform -chdir=terraform validate
terraform -chdir=terraform plan -refresh=false -input=false -var='project_id=get-spresso' -var='tool_server_image=us-central1-docker.pkg.dev/get-spresso/spresso/tool-server@sha256:REPLACE_WITH_VERIFIED_DIGEST'
```

The final plan command intentionally requires a real immutable digest; the
placeholder must not be supplied to a real plan or apply. Before every edit
to an existing symbol, run GitNexus upstream impact using the exact target.
After each isolated commit, run `detect-changes --scope compare --base-ref
main` and reject partial/truncated output as inconclusive.
