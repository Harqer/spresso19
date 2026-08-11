import { router } from "../server/routes.ts";
import express from "express";
import http from "http";

const app = express();
app.use(express.json());
app.use(router);

app.get("/healthz", (req, res) => res.status(200).send("OK"));

const server = http.createServer(app);

async function runVerification() {
  await new Promise<void>((resolve) => server.listen(3099, "127.0.0.1", resolve));

  const baseUrl = "http://127.0.0.1:3099";

  const results: Array<{ endpoint: string; status: number; success: boolean; dataSnippet: string }> = [];

  // GET /healthz
  const r1 = await fetch(`${baseUrl}/healthz`);
  results.push({ endpoint: "GET /healthz", status: r1.status, success: r1.status === 200, dataSnippet: await r1.text() });

  // GET /api/products
  const r2 = await fetch(`${baseUrl}/api/products`);
  const j2: any = await r2.json();
  results.push({ endpoint: "GET /api/products", status: r2.status, success: j2.success === true && Array.isArray(j2.products), dataSnippet: `Products count: ${j2.products?.length}` });

  // GET /api/inventory
  const r3 = await fetch(`${baseUrl}/api/inventory`);
  const j3: any = await r3.json();
  results.push({ endpoint: "GET /api/inventory", status: r3.status, success: j3.success === true && Array.isArray(j3.products), dataSnippet: `Inventory count: ${j3.products?.length}` });

  // POST /api/purchase/authorize
  const r4 = await fetch(`${baseUrl}/api/purchase/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "mug", quantity: 1, deviceSource: "ANDROID" })
  });
  const j4: any = await r4.json();
  results.push({ endpoint: "POST /api/purchase/authorize", status: r4.status, success: j4.success === true && !!j4.authorizationPayload?.humanInTheLoopChallenge, dataSnippet: `Auth ID: ${j4.authorizationPayload?.authorizationId}` });

  // POST /api/wardrobe/generate-outfit
  const r5 = await fetch(`${baseUrl}/api/wardrobe/generate-outfit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weatherCondition: "COLD_WINTER", temperatureText: "35°F" })
  });
  const j5: any = await r5.json();
  results.push({ endpoint: "POST /api/wardrobe/generate-outfit", status: r5.status, success: j5.success === true, dataSnippet: JSON.stringify(j5) });

  console.log("\n=== VERIFICATION RESULTS ===");
  console.log(JSON.stringify(results, null, 2));

  server.close(() => process.exit(0));
}

runVerification();
