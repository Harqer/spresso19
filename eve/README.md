# Spresso Eve audit workspace

This directory is a development-only Eve workspace for auditing and remediating Spresso. It is not imported by the Android, Web, Convex, Firebase Functions, or wearable runtime, and it must not be deployed with the app.

## Runtime requirement

Eve 0.59.1 requires Node.js 24 or newer. The repository's current Node runtime is older, so install dependencies and run Eve only from an approved Node 24 development environment.

```bash
cd eve
npm install
npm run info
npm run dev
```

Do not run `eve link` or `eve deploy` for this audit workspace. Do not add production credentials, channels, browser automation, OpenClaw, or Vercel deployment configuration.

## Structure

- `agent/instructions.md` — primary architect/reviewer prompt.
- `agent/subagents/` — bounded domain specialists with non-overlapping audit scopes.
- `agent/skills/` — on-demand procedures shared by the root reviewer.

Each specialist returns structured findings and proposed changes. The primary reviewer owns conflict resolution and final acceptance; specialists must not edit files outside their assigned scope.
