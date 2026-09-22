import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ACTIONS = new Set([
  "lens-search",
  "catalog-discovery",
  "cart-add",
  "cart-remove",
  "merchant-handoff",
  "virtual-try-on",
  "profile-save",
  "wardrobe-save",
  "grocery-toggle",
  "travel-receipt-parse",
  "orders-refresh",
  "passkey-registration",
]);

async function loadBridgeRoutes(repoRoot) {
  const source = await fs.readFile(path.join(repoRoot, "convex/http.ts"), "utf8");
  return new Set(
    [...source.matchAll(/http\.route\(\{\s*path:\s*["']([^"']+)["']/g)].map((match) => match[1]),
  );
}

export function validateActionContract(contract, { bridgeRoutes }) {
  const errors = [];
  if (!contract || contract.version !== 1 || !Array.isArray(contract.actions)) {
    return ["Action contract must contain version 1 and an actions array."];
  }

  const ids = new Set();
  for (const action of contract.actions) {
    if (!action || typeof action.id !== "string" || !action.id.trim()) {
      errors.push("Every action must have a non-empty id.");
      continue;
    }
    if (ids.has(action.id)) errors.push(`${action.id} is declared more than once.`);
    ids.add(action.id);
    if (typeof action.callback !== "string" || !action.callback.trim()) {
      errors.push(`${action.id} callback must be a non-empty string.`);
    }
    if (!Array.isArray(action.platforms) || action.platforms.length === 0 || action.platforms.some(platform => !["android", "wasm"].includes(platform))) {
      errors.push(`${action.id} platforms must list android and/or wasm.`);
    }
    for (const field of ["screen", "backendContract", "successState", "emptyState", "failureState", "owner"]) {
      if (typeof action[field] !== "string" || !action[field].trim()) {
        errors.push(`${action.id} ${field} must be a non-empty string.`);
      }
    }
    const transport = action.transport;
    if (!transport || typeof transport.kind !== "string") {
      errors.push(`${action.id} must declare a transport kind.`);
      continue;
    }
    if (transport.kind === "convex-bridge") {
      if (typeof transport.route !== "string" || !transport.route.startsWith("/api/")) {
        errors.push(`${action.id} must name a Convex bridge /api/ route.`);
      } else if (bridgeRoutes && !bridgeRoutes.has(transport.route)) {
        errors.push(`${action.id} transport route ${transport.route} is not registered in convex/http.ts.`);
      }
    } else if (transport.kind === "external-url") {
      if (typeof transport.destination !== "string" || !transport.destination.trim()) {
        errors.push(`${action.id} must name an external destination.`);
      }
    } else if (transport.kind === "platform") {
      if (typeof transport.operation !== "string" || !transport.operation.trim()) {
        errors.push(`${action.id} must name a platform operation.`);
      }
    } else {
      errors.push(`${action.id} has unsupported transport kind ${transport.kind}.`);
    }
  }

  for (const action of REQUIRED_ACTIONS) {
    if (!ids.has(action)) errors.push(`Required action ${action} is missing.`);
  }
  return errors;
}

export async function verifyActionContract(repoRoot) {
  const contractPath = path.join(repoRoot, "contracts/ui-actions.json");
  const [contractSource, bridgeRoutes] = await Promise.all([
    fs.readFile(contractPath, "utf8"),
    loadBridgeRoutes(repoRoot),
  ]);
  const errors = validateActionContract(JSON.parse(contractSource), { bridgeRoutes });
  if (errors.length) throw new Error(errors.join("\n"));
  return { actionCount: REQUIRED_ACTIONS.size, routeCount: bridgeRoutes.size };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const result = await verifyActionContract(repoRoot);
    console.log(`Verified ${result.actionCount} UI actions against ${result.routeCount} Convex bridge routes.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
