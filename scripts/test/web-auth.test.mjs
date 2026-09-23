import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const resources = "composeApp/src/wasmJsMain/resources/";
const source = readFileSync(`${resources}firebase-auth.js`, "utf8");
const html = readFileSync(`${resources}index.html`, "utf8");

test("startup waits for Firebase session restoration before starting Kotlin", async () => {
  let restoreSession;
  const restored = new Promise((resolve) => { restoreSession = resolve; });
  let script;
  let messageRemoved = false;
  const context = vm.createContext({
    loadFirebase: async () => {},
    window: { _firebaseAuth: { authStateReady: () => restored } },
    document: {
      createElement: () => ({}),
      head: { appendChild(element) { script = element; } },
      getElementById: () => ({ remove() { messageRemoved = true; } }),
    },
  });
  const startup = readFileSync(`${resources}bootstrap.js`, "utf8").replace('import("./firebase-auth.js")', 'loadFirebase()');
  const running = vm.runInContext(`(async () => { ${startup} })()`, context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(script, undefined);
  restoreSession();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(script.src, "composeApp.js");
  assert.equal(messageRemoved, false);
  script.onload();
  await running;
  assert.equal(messageRemoved, true);
});

test("failed Firebase initialization keeps a recoverable customer-facing screen", async () => {
  let retry;
  let reloads = 0;
  const message = { appendChild(element) { retry = element; } };
  const context = vm.createContext({
    loadFirebase: async () => { throw new Error("internal detail"); },
    window: { location: { reload() { reloads++; } } },
    document: {
      createElement: () => ({}),
      head: { appendChild() { assert.fail("must not start Kotlin without Firebase"); } },
      getElementById: () => message,
    },
  });
  const startup = readFileSync(`${resources}bootstrap.js`, "utf8").replace('import("./firebase-auth.js")', 'loadFirebase()');
  await vm.runInContext(`(async () => { ${startup} })()`, context);
  assert.match(message.textContent, /try again/i);
  assert.doesNotMatch(message.textContent, /internal/);
  retry.onclick();
  assert.equal(reloads, 1);
});

// Only the external Firebase SDK is substituted. Execute the actual browser
// bridge, including its state, Promise handling, and customer-facing flow.
async function bridge(overrides = {}) {
  const alerts = [];
  const auth = { currentUser: null };
  const verifiers = [];
  const sdk = {
    initializeApp: () => ({}),
    getAuth: () => auth,
    GoogleAuthProvider: class {},
    onAuthStateChanged: (_auth, callback) => { callback(auth.currentUser); return () => {}; },
    signInWithPopup: async () => ({ user: { uid: "google-user" } }),
    signInWithPhoneNumber: async () => ({ confirm: async () => ({ user: { uid: "phone-user" } }) }),
    RecaptchaVerifier: class {
      constructor(_auth, container) {
        assert.ok(html.includes(`id="${container}"`), "reCAPTCHA needs a real DOM container");
        this.cleared = false;
        verifiers.push(this);
      }
      clear() { this.cleared = true; }
    },
    ...overrides,
  };
  const window = {
    alert: (message) => alerts.push(message),
    prompt: () => null,
  };
  const context = vm.createContext({
    ...sdk, window,
    console: { error() {} },
    fetch: async () => ({ ok: true, json: async () => ({ projectId: "get-spresso" }) }),
  });
  await vm.runInContext(`(async () => { ${source.replace(/^import .*;\s*$/gm, "")} })()`, context);
  return { window, auth, alerts, verifiers };
}

test("Google sign-in returns the Firebase user and propagates provider rejection", async () => {
  const { window } = await bridge();
  assert.equal((await window.signInWithGoogle()).user.uid, "google-user");
  const failure = new Error("auth/popup-blocked");
  const failed = await bridge({ signInWithPopup: async () => { throw failure; } });
  await assert.rejects(failed.window.signInWithGoogle(), (error) => error === failure);
});

test("Convex receives the Firebase ID token, and no token after sign-out", async () => {
  const { window, auth } = await bridge();
  assert.equal(await window.getFirebaseUserIdToken(), null);
  auth.currentUser = { getIdToken: async (refresh) => {
    assert.equal(refresh, false);
    return "firebase-id-token";
  } };
  assert.equal(await window.getFirebaseUserIdToken(), "firebase-id-token");
  auth.currentUser = null;
  assert.equal(await window.getFirebaseUserIdToken(), null);
});

test("phone sign-in has a reCAPTCHA host and verifies an SMS code", async () => {
  const { window } = await bridge();
  assert.equal(await window.signInWithPhone("+15555550100"), true);
  assert.equal(await window.verifyPhoneCode("123456"), true);
});

test("failed SMS requests clear reCAPTCHA so a new attempt can succeed", async () => {
  let attempts = 0;
  const { window, verifiers } = await bridge({
    signInWithPhoneNumber: async () => {
      if (++attempts === 1) throw new Error("auth/network-request-failed");
      return { confirm: async () => ({ user: { uid: "phone-user" } }) };
    },
  });
  await assert.rejects(window.signInWithPhone("+15555550100"));
  assert.equal(verifiers[0].cleared, true);
  assert.equal(await window.signInWithPhone("+15555550100"), true);
  assert.equal(verifiers.length, 2);
});

test("a failed new SMS request cannot confirm an older phone number", async () => {
  let attempts = 0;
  const { window } = await bridge({
    signInWithPhoneNumber: async () => {
      if (++attempts === 2) throw new Error("auth/too-many-requests");
      return { confirm: async () => ({ user: { uid: "old-phone-user" } }) };
    },
  });
  await window.signInWithPhone("+15555550100");
  await assert.rejects(window.signInWithPhone("+15555550101"));
  assert.equal(await window.verifyPhoneCode("123456"), false);
});

test("phone prompt consumes async failures without exposing provider details", async () => {
  const { window, alerts } = await bridge({
    signInWithPhoneNumber: async () => { throw new Error("auth/internal-error sensitive detail"); },
  });
  window.prompt = () => "+15555550100";
  await window.requestPhoneSignIn();
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /try again/i);
  assert.doesNotMatch(alerts[0], /auth\/|sensitive|internal/);
});

test("a wrong SMS code lets the user retry without requesting another SMS", async () => {
  let requests = 0;
  const { window, alerts } = await bridge({
    signInWithPhoneNumber: async () => {
      requests++;
      return { confirm: async (code) => {
        if (code !== "123456") throw Object.assign(new Error("bad code"), { code: "auth/invalid-verification-code" });
        return { user: { uid: "phone-user" } };
      } };
    },
  });
  const answers = ["+15555550100", "000000", "123456"];
  window.prompt = () => answers.shift() ?? null;
  assert.equal(await window.requestPhoneSignIn(), true);
  assert.equal(requests, 1);
  assert.equal(alerts.length, 1);
});

test("cancelling phone sign-in sends no SMS and reports no failure", async () => {
  const { window, alerts } = await bridge({
    signInWithPhoneNumber: async () => assert.fail("must not send SMS"),
  });
  assert.equal(await window.requestPhoneSignIn(), false);
  assert.deepEqual(alerts, []);
});

test("Hosting policy permits the auth SDK, provider frames and authenticated API requests", () => {
  const { hosting } = JSON.parse(readFileSync("firebase.json", "utf8"));
  const policy = hosting.headers.find(({ source }) => source === "**").headers
    .find(({ key }) => key === "Content-Security-Policy").value;
  const directives = Object.fromEntries(policy.split(";").filter((s) => s.trim()).map((s) => {
    const [name, ...values] = s.trim().split(/\s+/);
    return [name, values];
  }));
  for (const [type, url] of [
    ["script-src", "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"],
    ["script-src", "https://www.google.com/recaptcha/api.js"],
    ["script-src", "https://www.gstatic.com/recaptcha/releases/example/recaptcha__en.js"],
    ["frame-src", "https://get-spresso.firebaseapp.com/__/auth/iframe"],
    ["frame-src", "https://www.google.com/recaptcha/api2/anchor"],
    ["connect-src", "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp"],
    ["connect-src", "https://securetoken.googleapis.com/v1/token"],
    ["connect-src", "https://woozy-anteater-572.convex.site/api/account/me"],
  ]) {
    const allowed = directives[type] ?? directives["default-src"];
    assert.ok(allowed.some((entry) => entry === new URL(url).origin ||
      (entry.endsWith("/") && url.startsWith(entry))), `${type} blocks ${url}`);
  }
  assert.ok(!directives["connect-src"].includes("*"));
});
