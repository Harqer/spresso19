# Learning Record 0001: Kitesurf vs. Firecrawl vs. Simple Scrapers

## Key Insights
- **Simple Scrapers (`fetch`, `curl`, `cheerio`)**: Only fetch static raw HTML. They break completely on JavaScript SPAs (React/Vue/Angular) and cannot interact with pages.
- **Firecrawl**: A SaaS crawling API that wraps Playwright/Chromium to turn pages into Markdown. High cost, centralized latency, limited custom interactive execution loops.
- **Cloudflare Kitesurf**: An agent-native browser engine executing directly inside Cloudflare Workers V8 isolates. Provides sub-millisecond startup, full JS execution, interactive multi-step actions, and edge-native scale.

## Decision Matrix
Use **Simple Scrapers** for static RSS/HTML.  
Use **Firecrawl** for basic sitemap crawling without host infrastructure.  
Use **Cloudflare Kitesurf** for agentic multi-step workflows, interactive JS execution, visual screenshot inspection, and ultra-low-latency edge execution.
