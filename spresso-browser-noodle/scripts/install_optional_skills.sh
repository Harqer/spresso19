#!/usr/bin/env bash
set -euo pipefail

# Optional specialist skills. Review third-party skill sources before installing.
# The core bundle contains technical fallbacks, so these are not prerequisites.

echo "Installing Microsoft's Playwright agent skill into .agents/skills..."
npx playwright-cli install --skills=agents

echo "Installing JetBrains/Kotlin AGP 9 migration skill..."
npx skills add Kotlin/kotlin-agent-skills --skill kotlin-tooling-agp9-migration

echo "Installing Browserbase CLI skill..."
npx skills add browserbase/skills --skill browserbase-cli

echo
echo "Convex phases expect convex-expert and convex-reviewer when available."
echo "If your agent does not already provide them, install the official get-convex/agent-skills package/plugin using your agent's skill manager."
