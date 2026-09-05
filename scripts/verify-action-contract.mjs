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
const EXPORT_TRANSPORTS = new Set(["firebase-callable", "firebase-http"]);

async function resolveModule(modulePath) {
  for (const candidate of [`${modulePath}.ts`, path.join(modulePath, "index.ts")]) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next TypeScript module shape.
    }
  }
  return null;
}

async function collectExportedFunctions(entryFile, visited = new Set()) {
  if (visited.has(entryFile)) return new Set();
  visited.add(entryFile);
  const source = await fs.readFile(entryFile, "utf8");
  const exported = new Set([...source.matchAll(/export\s+(?:const|function|class)\s+([A-Za-z_$][\w$]*)/g)].map(match => match[1]));
  const exportAll = /export\s+(?:\*|\{[^}]*\})\s+from\s+["'](.+?)["']/g;
  for (const match of source.matchAll(exportAll)) {
    if (!match[1].startsWith(".")) continue;
    const target = await resolveModule(path.resolve(path.dirname(entryFile), match[1]));
    if (!target) continue;
    for (const name of await collectExportedFunctions(target, visited)) exported.add(name);
  }
  return exported;
}

export function validateActionContract(contract, { exportedFunctions }) {
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
    if (EXPORT_TRANSPORTS.has(transport.kind)) {
      if (typeof transport.export !== "string" || !transport.export.trim()) {
        errors.push(`${action.id} must name a Firebase export.`);
      } else if (!exportedFunctions.has(transport.export)) {
        errors.push(`${action.id} transport export ${transport.export} is not exported by functions/src/index.ts.`);
      }
    } else if (!["dataconnect", "platform", "external-url"].includes(transport.kind)) {
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
  const rootExport = path.join(repoRoot, "functions/src/index.ts");
  const [contractSource, exportedFunctions] = await Promise.all([
    fs.readFile(contractPath, "utf8"),
    collectExportedFunctions(rootExport),
  ]);
  const errors = validateActionContract(JSON.parse(contractSource), { exportedFunctions });
  if (errors.length) throw new Error(errors.join("\n"));
  return { actionCount: REQUIRED_ACTIONS.size, exportCount: exportedFunctions.size };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const result = await verifyActionContract(repoRoot);
    console.log(`Verified ${result.actionCount} UI actions against ${result.exportCount} Functions exports.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
