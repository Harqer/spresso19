# Spresso browser automation phase state

Noodle phase skills use this directory only for merged phase gates.

A phase writes `PHASE-N-DONE.md` only after all required checks for that phase pass.
A genuine external blocker writes `PHASE-N-BLOCKED.md` and does not write DONE.

The next scheduled phase is eligible only after the previous DONE marker exists on the base branch.

Do not hand-create DONE markers to skip work.
