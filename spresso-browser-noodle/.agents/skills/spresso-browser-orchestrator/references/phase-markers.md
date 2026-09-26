# Phase marker protocol

Each phase writes its marker only after its completion gates pass.

DONE format:

```markdown
# Phase N complete
- completed_at_utc:
- branch_commit:
- changed_paths:
- verification:
  - command: result
- invariants:
  - ...
- next_phase: N+1
```

A genuine external blocker writes `PHASE-N-BLOCKED.md` with:
- exact failing command/API/permission;
- evidence;
- why code changes cannot resolve it;
- exact human/external action required.

Do not use BLOCKED for ordinary implementation difficulty. Fix code instead.

A phase schedule treats either its DONE or BLOCKED marker as not eligible. Remove a BLOCKED marker only after its cause is resolved.
