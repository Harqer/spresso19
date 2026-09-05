# GitNexus remediation plan

## Baseline

The working tree currently contains 547 changed paths (201 untracked and 346 modified/deleted), and `main` is nine commits behind `origin/main`. GitNexus therefore reports aggregate critical risk across 287 files, 1,051 symbols, and 122 affected processes. This is a workspace-boundary problem first; it is not evidence that every changed symbol is defective.

Before any cleanup, preserve the tree in a recoverable checkpoint. Never use `git reset --hard`, `git clean`, or bulk deletion as a substitute for classification.

## Parallel classification lanes

The following lanes run concurrently and have disjoint ownership:

1. Android/KMP: package migration, DAT, CameraX, manifests, and generated Android sources.
2. Backend: Functions, AI, Stripe/Coinbase boundaries, Firebase configuration, and generated `functions/lib` output.
3. Web/infrastructure: React/Vite, Terraform, deployment configuration, and web-only generated artifacts.

Each lane produces an inventory before making production changes. Inventory entries must identify canonical files, legacy candidates, generated output, graph ambiguity, and verification commands.

## Integration sequence

After all inventories return:

1. Review overlaps and classify every path as retain, migrate, regenerate, archive, or delete-with-approval.
2. Create one recoverable checkpoint, then split work into domain commits using the lane ownership.
3. Re-run GitNexus analysis after each domain commit; use exact target UIDs for duplicate symbols.
4. Run focused tests and builds for each lane, then run cross-domain verification.
5. Reconcile the nine upstream commits only after the checkpoint and lane commits are stable.
6. Run `detect-changes --scope compare --base-ref main` and review any remaining HIGH/CRITICAL result against actual callers.

## Completion criteria

- Every changed path has an owner and disposition.
- Generated output is either reproducibly regenerated or explicitly excluded from source ownership.
- Legacy package/config files have documented references before removal.
- Each production change has upstream impact evidence and focused verification.
- Final GitNexus risk reflects intentional pending work rather than the entire unclassified workspace.
