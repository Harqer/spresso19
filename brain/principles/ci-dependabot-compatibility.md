# CI Dependabot Compatibility

When orchestrating multi-agent systems or automated PR reviewers (such as self-healing agents, autonomous testing scripts, or agents leveraging the `@genkit-ai` framework / Lyria model), ensure they do not interfere with standard automated pipeline bots like Dependabot.

### Guidelines
1. **Scope the Triggers**: Avoid blanket `on: [pull_request, issue_comment]` triggers for AI agents without explicitly ignoring automated branches or actors (e.g., `if: github.actor != 'dependabot[bot]'`).
2. **Remove Intrusive Reviewers**: The user explicitly dislikes custom agentic reviewer scripts that block or clash with Dependabot scans. Do not re-add custom Python reviewer loops (`agentic_reviewer.py`, `self_healing_agent.py`) into the CI without strict isolation constraints.
3. **Prefer Native Solutions**: If an AI review process gets stuck in an infinite auto-fix loop on a Dependabot PR, that process is misconfigured and must be disabled. Let Dependabot handle dependency resolution natively.
