import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const app = readFileSync("src/App.tsx", "utf8");
const firebaseLib = readFileSync("src/lib/firebase.ts", "utf8");
const Logger = readFileSync("src/lib/Logger.ts", "utf8");
const convexState = readFileSync("src/lib/convexState.ts", "utf8");
const convexProvider = readFileSync("src/lib/convex.tsx", "utf8");
const productionConfig = readFileSync(".env.production.example", "utf8");

 test("production release configuration points to the verified Convex deployment", () => {
  assert.match(productionConfig, /^VITE_CONVEX_URL=https:\/\/woozy-anteater-572\.convex\.cloud$/m);
  assert.doesNotMatch(productionConfig, /localhost|127\.0\.0\.1|decisive-dolphin-161/);
});

test("Firebase is retained for identity while preferences and cart state use Convex", () => {
  assert.match(convexProvider, /onAuthStateChanged/);
  assert.match(app, /useConvexPreferences/);
  assert.match(app, /useConvexCart/);
  assert.match(app, /convexCart\.addItem/);
  assert.match(app, /convexCart\.removeItem/);
  assert.doesNotMatch(app, /setDoc\(doc\(firestoreDb,\s*["']users/);
  assert.doesNotMatch(app, /authFetch\(["']\/api\/(cart|user\/preferences)/);
});

test("the Convex state gateway exposes bounded typed operations", () => {
  assert.match(convexState, /CONVEX_LIST_LIMIT = 100/);
  for (const operation of ["useConvexPreferences", "useConvexCart", "useConvexSavedProducts", "useConvexWardrobe"]) {
    assert.match(convexState, new RegExp(`export function ${operation}`));
  }
});

// Capstone gate: the web app is Firebase-Auth-only. No non-auth Firebase SDK
// surface may be imported anywhere under src/.
const srcForbiddenImports = {
  "firebase/firestore": /from ["']firebase\/firestore["']/,
  "firebase/database": /from ["']firebase\/database["']/,
  "firebase/storage": /from ["']firebase\/storage["']/,
  "firebase/functions": /from ["']firebase\/functions["']/,
  "firebase/data-connect": /from ["']firebase\/data-connect["']/,
};

function listSrcFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "dataconnect" || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSrcFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const [pkg, pattern] of Object.entries(srcForbiddenImports)) {
  test(`no ${pkg} import remains under src/`, () => {
    const offenders = listSrcFiles("src")
      .map((path) => ({ path, code: readFileSync(path, "utf8") }))
      .filter(({ code }) => pattern.test(code))
      .map(({ path }) => path);
    assert.deepEqual(offenders, []);
  });
}

test("no httpsCallable usage remains under src/", () => {
  const offenders = listSrcFiles("src").filter((path) => {
    const code = readFileSync(path, "utf8");
    return /httpsCallable|getFunctions/.test(code) || code.includes("firebase/functions");
  });
  assert.deepEqual(offenders, []);
});

test("Logger no longer persists to Firestore", () => {
  assert.doesNotMatch(Logger, /firestore|addDoc|collection\(/);
});

test("the realtime-sync RTDB hook is gone", () => {
  assert.equal(existsSync("src/hooks/useRealtimeSync.ts"), false);
});

test("firebase.ts initializes Auth plus platform services only", () => {
  for (const banned of ["getFirestore", "getDatabase", "getStorage", "getFunctions", "getDataConnect"]) {
    assert.doesNotMatch(firebaseLib, new RegExp(banned));
  }
  assert.match(firebaseLib, /getAuth/);
  assert.match(firebaseLib, /initializeAppCheck/);
});
