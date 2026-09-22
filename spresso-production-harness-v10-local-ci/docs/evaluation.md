# External Evaluation

When asked to evaluate the newest open PR, use fresh context.

Inspect:
- active ticket/spec
- full diff
- GitHub checks
- affected execution paths
- callers/consumers
- state ownership
- tests/configuration
- relevant external contracts

Derive checks from the actual change. Green CI is evidence, not proof.

Verify correctness, regressions, architecture, domain semantics, lifecycle, concurrency, failure behavior, and meaningful tests.

If correct: `PASS`.

Otherwise return one concise remediation prompt containing:
- Finding
- Evidence
- Impact
- Required behavior
- Verification

The implementation agent repairs the same PR, then reevaluate.
