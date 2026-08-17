import re

# Fix routes.ts
with open("/home/shaolin/Spresso/server/routes.ts", "r") as f:
    content = f.read()

# remove bad imports
content = re.sub(r'import\s+\{.*?\}\s+from\s+"./flows/tryOnOrchestrationFlow";?', '', content)
content = re.sub(r'import\s+\{.*?\}\s+from\s+"./actions/vitposeAction";?', '', content)
content = re.sub(r'import\s+\{.*?\}\s+from\s+"./genkitFlows";?', '', content)

with open("/home/shaolin/Spresso/server/routes.ts", "w") as f:
    f.write(content)

# Fix apifyService.ts
with open("/home/shaolin/Spresso/server/apifyService.ts", "r") as f:
    apify = f.read()

apify = apify.replace('import { getActiveInventory } from "./inventory";', 'import { seedCatalogInventory } from "./inventory";\nconst liveInventory = seedCatalogInventory;\n')

with open("/home/shaolin/Spresso/server/apifyService.ts", "w") as f:
    f.write(apify)

