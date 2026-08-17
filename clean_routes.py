import re

with open("/home/shaolin/Spresso/server/routes.ts", "r") as f:
    content = f.read()

def replace_block(content, start_str, replacement):
    idx = content.find(start_str)
    if idx == -1: return content
    open_brace = content.find("{", idx)
    if open_brace == -1: return content
    brace_count = 1
    i = open_brace + 1
    while i < len(content) and brace_count > 0:
        if content[i] == '{': brace_count += 1
        elif content[i] == '}': brace_count -= 1
        i += 1
    return content[:open_brace+1] + replacement + content[i-1:]

routes_to_stub = [
    "/api/personalized-feed",
    "/api/genmedia-kit",
    "/api/creative-studio/synthesize",
    "/api/wardrobe/generate-outfit",
    "/api/chat/stream",
    "/api/try-on",
    "/api/vitpose/extract-keypoints",
    "/api/vitpose/orchestrate-fit",
    "/api/economic-research",
    "/api/creator/generate-campaign",
    "/api/genkit/creative-pipeline",
    "/api/recipe/bargain-chef"
]

for route in routes_to_stub:
    start_str = f'router.post("{route}"'
    content = replace_block(content, start_str, '\n  res.status(501).json({ error: "Migrated to Go Backend" });\n')

with open("/home/shaolin/Spresso/server/routes.ts", "w") as f:
    f.write(content)
