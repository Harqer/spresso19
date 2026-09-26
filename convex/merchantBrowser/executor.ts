"use node";
/**
 * Playwright executor — the ONLY module that drives browsers.
 *
 * Executes typed BrowserExecutionRequest batches (merchantBrowser/contracts.ts)
 * against a live Chromium: the production path connects playwright-core over
 * CDP to a Browserbase session (connectUrl resolved per action by
 * merchantBrowser/browserbase.ts, in memory only); tests may start a local
 * Chromium through startLocalExecutor.
 *
 * Semantics (binding, from the Phase 1 contracts):
 *  - AGENT-authority batches REJECT `cdp` operations; CDP is the credential
 *    broker's escape hatch only, and administrative methods that would kill
 *    the browser or disable enforcement are rejected even for the broker.
 *  - A state-changing operation that times out AFTER dispatch yields
 *    OUTCOME_UNKNOWN for the batch — never a blind failure/retry — because the
 *    merchant-side effect may have landed. Read-only timeouts fail with typed
 *    reasons.
 *  - A batch is verified success only when outcome is OK and every declared
 *    postcondition assertion passed. Nothing here fabricates success.
 *  - Results are compact: bounded observations and counters, never full DOM
 *    dumps, and never provider transport values.
 */
import { readFileSync } from "node:fs";
import { chromium, type Browser, type BrowserContext, type Download, type Locator, type Page, type FrameLocator } from "playwright-core";
import type {
  BrowserAssertion,
  BrowserExecutionRequest,
  BrowserExecutionResult,
  BrowserFrameScope,
  BrowserLocatorTarget,
  BrowserOperation,
  BrowserOperationResult,
  FileStagingArea,
} from "./contracts";
import { isVerifiedSuccess } from "./contracts";

const DEFAULT_BATCH_TIMEOUT_MS = 20_000;
const CONNECT_TIMEOUT_MS = 15_000;
const MAX_NETWORK_EVENTS = 50;
const MAX_OBSERVATION_SUMMARY_CHARS = 4_000;

/** CDP methods that would end the browser or defeat enforcement — broker-included. */
const FORBIDDEN_CDP_METHODS = [
  /^Browser\.close$/i,
  /^Browser\.crash$/i,
  /^Page\.crash$/i,
  /^Page\.close$/i,
  /^Target\.closeTarget$/i,
  /^Target\.disposeBrowserContext$/i,
  /^Target\.createBrowserContext$/i,
];

/**
 * Operations whose timeout leaves the true page effect undetermined (the
 * command may still have been applied by the page). A timed-out `navigate`
 * is NOT here: Playwright aborts the navigation, and `waitFor` never changes
 * anything — those fail with typed reasons instead.
 */
const AMBIGUOUS_ON_TIMEOUT_OPS = new Set<BrowserOperation["op"]>([
  "click", "fill", "type", "press", "selectOption", "setChecked", "drag", "uploadFiles", "evaluate",
]);

export type ExecutorHandle = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  /** Bounded network log captured while the handle is open. */
  network: Array<{ url: string; status: number }>;
};

/** Production path: connect to the Browserbase session's live CDP endpoint. */
export async function startRemoteExecutor(connectUrl: string): Promise<ExecutorHandle> {
  const browser = await chromium.connectOverCDP(connectUrl, { timeout: CONNECT_TIMEOUT_MS });
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());
  return withNetworkLog({ browser, context, page, network: [] });
}

/** Test/dev path: launch a local Chromium (no Browserbase, no downloads). */
export async function startLocalExecutor(executablePath: string, headless = true): Promise<ExecutorHandle> {
  const browser = await chromium.launch({ executablePath, headless, args: ["--no-sandbox"] });
  // ignoreHTTPSErrors: local test merchants run on self-signed certificates.
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  return withNetworkLog({ browser, context, page, network: [] });
}

function withNetworkLog(handle: ExecutorHandle): ExecutorHandle {
  handle.page.on("response", (response) => {
    if (handle.network.length < MAX_NETWORK_EVENTS) {
      handle.network.push({ url: response.url(), status: response.status() });
    }
  });
  return handle;
}

/**
 * Local-session registry: mirrors the production contract where the browser
 * session persists across actions while the client connects per action. In
 * local-executor mode the browser for a providerSessionId is kept alive here
 * until the session is released.
 */
const localExecutors = new Map<string, ExecutorHandle>();

export async function getOrCreateLocalExecutor(providerSessionId: string, executablePath: string): Promise<ExecutorHandle> {
  const existing = localExecutors.get(providerSessionId);
  if (existing) return existing;
  const handle = await startLocalExecutor(executablePath);
  localExecutors.set(providerSessionId, handle);
  return handle;
}

/** Close and forget the local browser for a released session. */
export async function closeLocalExecutor(providerSessionId: string): Promise<void> {
  const handle = localExecutors.get(providerSessionId);
  if (!handle) return;
  localExecutors.delete(providerSessionId);
  try {
    await handle.browser.close();
  } catch {
    // Already gone.
  }
}

/** Close and forget ALL local browsers (test isolation between tests). */
export async function resetLocalExecutors(): Promise<void> {
  const handles = [...localExecutors.values()];
  localExecutors.clear();
  await Promise.all(
    handles.map((handle) => handle.browser.close().catch(() => undefined)),
  );
}

/** Disconnect the Playwright client WITHOUT ending the remote session. */
export async function disconnectExecutor(handle: ExecutorHandle): Promise<void> {
  try {
    await handle.browser.close();
  } catch {
    // The remote session stays alive on Browserbase; only our client detaches.
  }
}

function rejectCdp(method: string): boolean {
  return FORBIDDEN_CDP_METHODS.some((pattern) => pattern.test(method));
}

function operationTimeout(op: BrowserOperation, request: BrowserExecutionRequest): number {
  const perOp = "timeoutMs" in op && typeof op.timeoutMs === "number" ? op.timeoutMs : undefined;
  return perOp ?? request.timeoutMs ?? DEFAULT_BATCH_TIMEOUT_MS;
}

/** Ops with a native Playwright deadline (actionability/wait timeouts). */
function hasNativeTimeout(op: BrowserOperation): boolean {
  return op.op === "navigate" || op.op === "click" || op.op === "fill" || op.op === "type" ||
    op.op === "press" || op.op === "selectOption" || op.op === "setChecked" || op.op === "hover" || op.op === "waitFor";
}

/**
 * Native deadline sits a fixed margin BELOW the batch wrapper deadline, so a
 * never-dispatched actionability timeout is ALWAYS reported by Playwright
 * (typed hard failure) and our wrapper only fires for operations Playwright
 * cannot itself abort (e.g. a hung evaluate) — the OUTCOME_UNKNOWN case.
 */
function nativeTimeout(wrapperTimeoutMs: number): number {
  return Math.max(200, wrapperTimeoutMs - 1_500);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        clearTimeout(timer);
        reject(cause);
      },
    );
  });
}

/** Resolve a typed locator target onto the page (semantic locators first). */
function resolveLocator(page: Page, target: BrowserLocatorTarget, frame?: BrowserFrameScope): Locator | FrameLocator {
  // A frame URL is matched against the embedding iframe's src; anything else
  // is treated as a CSS selector for the frame element.
  const frameSelector = frame?.url && /^[a-z][\w-]*:|^\//i.test(frame.url) ? frame.url : frame?.url ? `iframe[src*="${frame.url}"]` : undefined;
  const scope: Page | FrameLocator = frameSelector ? page.frameLocator(frameSelector) : page;
  const scoped = scope as Page & FrameLocator;
  switch (target.kind) {
    case "role": return scoped.getByRole(target.role as never, { name: target.name, exact: target.exact });
    case "label": return scoped.getByLabel(target.label, { exact: target.exact });
    case "text": return scoped.getByText(target.text, { exact: target.exact });
    case "placeholder": return scoped.getByPlaceholder(target.placeholder, { exact: target.exact });
    case "altText": return scoped.getByAltText(target.alt, { exact: target.exact });
    case "title": return scoped.getByTitle(target.title, { exact: target.exact });
    case "testId": return scoped.getByTestId(target.testId);
    // Structural selectors may match several nodes by design (e.g. merchant
    // cart selector lists); the first match is the intended target and keeps
    // strict-mode from throwing on legitimate multi-match selectors.
    case "css": return scoped.locator(target.selector).first();
    case "xpath": return scoped.locator(`xpath=${target.expression}`).first();
  }
}

/**
 * Waiters armed before the batch (waiter-before-trigger contract). Popup and
 * download listeners exist from armWaiters() until the handle is dropped, so
 * an op that opens a popup or starts a download is captured even when the
 * triggering click resolves synchronously.
 */
export type WaiterArms = {
  popups: Array<{ url: string; openerUrl: string }>; // pending popup resolution
  downloads: Array<{ suggestedFilename: string; refId: string | null; failure?: string }>; // pending download resolution
  popupCount: number;
  downloadCount: number;
};

/**
 * Arm popup/download waiters on the context BEFORE any operation runs.
 * Popup pages navigate in their own time; each popup arms its own download
 * listener so a download triggered inside a popup is still captured.
 */
export function armWaiters(handle: ExecutorHandle, request: BrowserExecutionRequest): WaiterArms {
  const arms: WaiterArms = { popups: [], downloads: [], popupCount: 0, downloadCount: 0 };
  const wantPopups = request.armWaiters?.popups === true;
  const wantDownloads = request.armWaiters?.downloads === true;
  const stage = request.stagedFiles;

  if (wantPopups) {
    handle.context.on("page", (popup) => {
      void popup.waitForLoadState("domcontentloaded").catch(() => undefined).then(() => {
        arms.popups.push({ url: popup.url(), openerUrl: handle.page.url() });
        arms.popupCount += 1;
      });
    });
  }
  if (wantDownloads) {
    const onDownload = (download: Download) => {
      arms.downloadCount += 1;
      void (async () => {
        if (!stage) {
          arms.downloads.push({ suggestedFilename: download.suggestedFilename(), refId: null, failure: "no staging area provided" });
          return;
        }
        try {
          const path = await download.path();
          if (!path) {
            arms.downloads.push({ suggestedFilename: download.suggestedFilename(), refId: null, failure: "download produced no file" });
            return;
          }
          const bytes = readFileSync(path);
          if (bytes.byteLength > stage.maxFileBytes) {
            arms.downloads.push({ suggestedFilename: download.suggestedFilename(), refId: null, failure: "download exceeded staging limit" });
            return;
          }
          const fileRef = await stage.write({ name: download.suggestedFilename(), bytes: new Uint8Array(bytes) });
          arms.downloads.push({ suggestedFilename: download.suggestedFilename(), refId: fileRef.refId });
        } catch (cause) {
          arms.downloads.push({
            suggestedFilename: download.suggestedFilename(),
            refId: null,
            failure: cause instanceof Error ? cause.message.slice(0, 120) : "download capture failed",
          });
        }
        void download.delete().catch(() => tempCleanup);
      })();
    };
    handle.context.on("download", onDownload);
    handle.context.on("page", (popup) => {
      popup.on("download", onDownload);
    });
  }
  return arms;
}

function tempCleanup(): void {
  // Download temp files are removed by Playwright's own cleanup; this hook
  // exists for symmetry with the waiter contract.
}

/** Execute one operation; throws on hard failure/timeout (caller classifies). */
async function runOne(page: Page, op: BrowserOperation, nativeTimeoutMs: number | undefined, stage?: FileStagingArea): Promise<unknown> {
  switch (op.op) {
    case "navigate": return page.goto(op.url, { waitUntil: op.waitUntil ?? "load", timeout: nativeTimeoutMs });
    case "click": {
      const locator = resolveLocator(page, op.target, op.frame) as Locator;
      return locator.click({
        button: op.options?.button,
        clickCount: op.options?.clickCount,
        modifiers: op.options?.modifiers,
        timeout: nativeTimeoutMs,
      });
    }
    case "fill": return (resolveLocator(page, op.target, op.frame) as Locator).fill(op.value, { timeout: nativeTimeoutMs });
    case "type": return (resolveLocator(page, op.target, op.frame) as Locator).pressSequentially(op.value, { delay: op.delayMs, timeout: nativeTimeoutMs });
    case "press": return op.target
      ? (resolveLocator(page, op.target, op.frame) as Locator).press(op.key, { timeout: nativeTimeoutMs })
      : page.keyboard.press(op.key);
    case "selectOption": return (resolveLocator(page, op.target, op.frame) as Locator).selectOption(op.values, { timeout: nativeTimeoutMs });
    case "setChecked": return (resolveLocator(page, op.target, op.frame) as Locator).setChecked(op.checked, { timeout: nativeTimeoutMs });
    case "hover": return (resolveLocator(page, op.target, op.frame) as Locator).hover({ timeout: nativeTimeoutMs });
    case "scroll": {
      if (op.target) return (resolveLocator(page, op.target, op.frame) as Locator).scrollIntoViewIfNeeded();
      const amount = op.direction === "up" || op.direction === "left" ? -op.amountPx : op.amountPx;
      return op.direction === "up" || op.direction === "down"
        ? page.mouse.wheel(0, amount)
        : page.mouse.wheel(amount, 0);
    }
    case "drag": return (resolveLocator(page, op.from, op.frame) as Locator).dragTo(resolveLocator(page, op.to, op.frame) as Locator);
    case "uploadFiles": {
      if (!stage) {
        throw new Error("uploadFiles requires a broker staging area on the request.");
      }
      const input = resolveLocator(page, op.target, op.frame) as Locator;
      const staged: Array<{ name: string; mediaType?: string; buffer: Buffer }> = [];
      for (const refId of op.fileRefIds) {
        const file = await stage.read(refId);
        if (!file) throw new Error(`Staged file ref ${refId} was not found in the staging area.`);
        if (file.bytes.byteLength > stage.maxFileBytes) {
          throw new Error(`Staged file ${file.name} exceeds the staging size limit.`);
        }
        staged.push({ name: file.name, mediaType: file.mediaType, buffer: Buffer.from(file.bytes) });
      }
      await input.setInputFiles(
        staged.map((file) => ({ name: file.name, mimeType: file.mediaType ?? "application/octet-stream", buffer: file.buffer })),
        { timeout: nativeTimeoutMs },
      );
      return staged.map((file) => file.name);
    }
    case "waitFor": {
      if (op.urlPattern) return page.waitForURL(op.urlPattern, { timeout: nativeTimeoutMs });
      if (op.target) {
        return (resolveLocator(page, op.target, op.frame) as Locator).waitFor({ state: op.state ?? "visible", timeout: nativeTimeoutMs });
      }
      return page.waitForLoadState("load");
    }
    case "switchTab": {
      const pages = page.context().pages();
      const index = typeof op.match.index === "number" ? op.match.index : pages.findIndex((p) => op.match.urlPattern && matchGlob(p.url(), op.match.urlPattern));
      if (index < 0 || index >= pages.length) throw new Error("no matching tab");
      return pages[index].bringToFront();
    }
    case "closeTab": {
      const pages = page.context().pages();
      if (pages.length <= 1) throw new Error("the last page cannot be closed");
      const index = typeof op.match.index === "number" ? op.match.index : pages.findIndex((p) => op.match.urlPattern && matchGlob(p.url(), op.match.urlPattern));
      if (index < 0 || index >= pages.length) throw new Error("no matching tab");
      return pages[index].close();
    }
    case "evaluate": return page.evaluate(op.expression);
    case "screenshot": {
      const bytes = await page.screenshot({ fullPage: op.fullPage ?? false, timeout: op.timeoutMs });
      if (stage && bytes.byteLength <= stage.maxFileBytes) {
        const artifact = await stage.write({ name: `screenshot-${Date.now()}.png`, mediaType: "image/png", bytes: new Uint8Array(bytes) });
        return artifact;
      }
      return { bytes: bytes.byteLength };
    }    case "observe": {
      const include = op.include ?? ["a11y"];
      const out: Record<string, unknown> = {};
      if (include.includes("a11y")) {
        out.a11y = (await page.locator("body").ariaSnapshot()).slice(0, MAX_OBSERVATION_SUMMARY_CHARS);
      }
      if (include.includes("dom")) {
        // Bounded targeted DOM observation: interactive-element census with
        // roles/names — never a full DOM dump.
        out.dom = await page.evaluate(`(function() {
          var nodes = document.querySelectorAll('a[href], button, input, select, textarea, [role]');
          var out = [];
          for (var i = 0; i < nodes.length && i < 100; i++) {
            var el = nodes[i];
            if (el.offsetParent === null) continue;
            out.push({
              tag: el.tagName.toLowerCase(),
              role: el.getAttribute('role') || '',
              name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 80),
              value: el.value !== undefined ? String(el.value).slice(0, 80) : undefined
            });
          }
          return out;
        })()`);
      }
      if (include.includes("network")) {
        out.networkRequested = true; // populated from the handle log by runBatch
      }
      return out;
    }
    case "cdp": {
      if (rejectCdp(op.method)) throw new Error(`CDP method ${op.method} is forbidden even for the broker.`);
      const session = await page.context().newCDPSession(page);
      return session.send(op.method as never, op.params as never);
    }
  }
}

function matchGlob(url: string, pattern: string): boolean {
  const regex = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
  return regex.test(url);
}

/** Bounded, JSON-safe capture of an evaluate return value (2KB serialized). */
function boundValue(value: unknown): unknown {
  try {
    const serialized = JSON.stringify(value ?? null);
    if (serialized === undefined || serialized.length > 2_048) return null;
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

async function evaluateAssertion(page: Page, assertion: BrowserAssertion): Promise<boolean> {
  switch (assertion.type) {
    case "urlMatches": return matchGlob(page.url(), assertion.pattern);
    case "urlHostEquals": {
      try {
        return new URL(page.url()).host === assertion.host;
      } catch {
        return false;
      }
    }
    case "titleContains": return (await page.title()).includes(assertion.text);
    case "elementVisible": return (resolveLocator(page, assertion.target, assertion.frame) as Locator).isVisible();
    case "elementHidden": return (resolveLocator(page, assertion.target, assertion.frame) as Locator).isHidden();
    case "elementTextEquals": {
      const text = await (resolveLocator(page, assertion.target, assertion.frame) as Locator).textContent({ timeout: 5_000 });
      return (text ?? "") === assertion.expected;
    }
    case "elementTextMatches": {
      const text = await (resolveLocator(page, assertion.target, assertion.frame) as Locator).textContent({ timeout: 5_000 });
      return text !== null && new RegExp(assertion.pattern).test(text);
    }
    case "elementCount": {
      const count = await (resolveLocator(page, assertion.target, assertion.frame) as Locator).count();
      if (typeof assertion.equals === "number") return count === assertion.equals;
      if (typeof assertion.min === "number" && count < assertion.min) return false;
      if (typeof assertion.max === "number" && count > assertion.max) return false;
      return true;
    }
    case "evaluateTruthy": return (await page.evaluate(assertion.expression)) === true;
    case "evaluateEquals": return JSON.stringify(await page.evaluate(assertion.expression)) === JSON.stringify(assertion.expected);
  }
}

/**
 * Execute a full batch: operations in order (first hard failure skips the
 * remainder), then assertions, then a compact observation. Never throws —
 * every failure mode is represented in the structured result.
 */
export async function runBatch(handle: ExecutorHandle, request: BrowserExecutionRequest): Promise<BrowserExecutionResult> {
  // Waiter-before-trigger: popup/download listeners exist from BEFORE the
  // first operation so synchronously-resolving triggers are still captured.
  const arms = armWaiters(handle, request);
  const operations: BrowserOperationResult[] = [];
  const screenshotRefs: string[] = [];
  let outcome: BrowserExecutionResult["outcome"] = "OK";
  let skipRest = false;

  for (let index = 0; index < request.operations.length; index += 1) {
    const op = request.operations[index];
    if (skipRest) {
      operations.push({ index, op: op.op, outcome: "SKIPPED" });
      continue;
    }
    // Authority separation: the AGENT never gets the raw CDP escape hatch.
    if (op.op === "cdp" && request.authority === "AGENT") {
      operations.push({ index, op: op.op, outcome: "FAILED", error: "cdp operations require the credential broker." });
      outcome = "FAILED";
      skipRest = true;
      continue;
    }
    const started = Date.now();
    const timeoutMs = operationTimeout(op, request);
    const native = hasNativeTimeout(op) ? nativeTimeout(timeoutMs) : undefined;
    try {
      const value = await withTimeout(Promise.resolve(runOne(handle.page, op, native, request.stagedFiles)), timeoutMs);
      operations.push({
        index,
        op: op.op,
        outcome: "OK",
        durationMs: Date.now() - started,
        ...(op.op === "evaluate" ? { value: boundValue(value) } : {}),
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      // Two very different timeouts:
      //  - Playwright's own TimeoutError (actionability/locator waits) means
      //    the command was NEVER dispatched — nothing changed, safe to fail.
      //  - OUR batch timeout ("timed out after ...ms") means the operation
      //    was still pending when the budget expired — for state-changing ops
      //    the command may have reached the page: OUTCOME_UNKNOWN.
      const timedOutAfterDispatch = message.includes("timed out after");
      if (timedOutAfterDispatch && AMBIGUOUS_ON_TIMEOUT_OPS.has(op.op)) {
        // Dispatched but unconfirmed: the page effect is unknown. The caller
        // must re-observe and reconcile before any retry.
        operations.push({ index, op: op.op, outcome: "OUTCOME_UNKNOWN", error: message, durationMs: Date.now() - started });
        outcome = "OUTCOME_UNKNOWN";
      } else {
        operations.push({ index, op: op.op, outcome: "FAILED", error: message.slice(0, 200), durationMs: Date.now() - started });
        outcome = "FAILED";
      }
      skipRest = true;
    }
  }

  const page = handle.page;
  const observe = async (): Promise<NonNullable<BrowserExecutionResult["observation"]>> => {
    const entry: NonNullable<BrowserExecutionResult["observation"]> = { currentUrl: page.url() };
    if (page.url().startsWith("http")) {
      try {
        entry.pageTitle = await page.title();
      } catch {
        // A title is optional evidence; never fail the batch for it.
      }
    }
    return entry;
  };

  // Domain guard: a landing outside the approved host is an escape, reported
  // with typed code (the provider turns this into a session-fatal failure).
  if (page.url().startsWith("http")) {
    try {
      if (new URL(page.url()).host !== request.merchantHost) {
        return {
          executionId: request.executionId,
          outcome: "FAILED",
          verified: false,
          operations,
          observation: await observe(),
          failure: { code: "REDIRECT_ESCAPE", message: `The page left the approved merchant host (${request.merchantHost}).`, recoverable: false },
        };
      }
    } catch {
      // Non-http page state (about:blank during navigation) — assertions decide.
    }
  }

  let verified = outcome === "OK";
  if (verified && request.assertions?.length) {
    const failed: string[] = [];
    for (const assertion of request.assertions) {
      try {
        if (!(await withTimeout(Promise.resolve(evaluateAssertion(page, assertion)), 8_000))) {
          failed.push(assertion.type);
        }
      } catch (cause) {
        failed.push(`${assertion.type} (${cause instanceof Error ? cause.message : String(cause)})`);
      }
    }
    if (failed.length > 0) {
      return {
        executionId: request.executionId,
        outcome: "FAILED",
        verified: false,
        operations,
        observation: await observe(),
        failure: { code: "ASSERTION_FAILED", message: `Postconditions not met: ${failed.join(", ")}.`, recoverable: false },
      };
    }
  }

  const result: BrowserExecutionResult = {
    executionId: request.executionId,
    outcome,
    verified,
    operations,
    observation: await observe(),
  };
  // Artifact/observation surfaces promised by the contract, populated only
  // when actually produced — never fabricated.
  if (arms.popupCount > 0) result.popupsOpened = arms.popupCount;
  const downloadRefs = arms.downloads.filter((d) => d.refId).map((d) => d.refId as string);
  if (downloadRefs.length > 0) result.downloadRefs = downloadRefs;
  if (screenshotRefs.length > 0) result.screenshotRefs = screenshotRefs;
  const patterns = request.armWaiters?.responseUrlPatterns ?? [];
  const network = patterns.length > 0
    ? handle.network.filter((event) => patterns.some((p) => matchGlob(event.url, p)))
    : handle.network;
  if (network.length > 0) result.observation!.network = network;
  if (outcome === "OUTCOME_UNKNOWN") {
    result.failure = { code: "OUTCOME_UNKNOWN", message: "A state-changing operation did not confirm before its timeout; re-observe before retrying.", recoverable: true };
  } else if (outcome === "FAILED") {
    const firstFailure = operations.find((operation) => operation.outcome === "FAILED");
    result.failure = { code: "OPERATION_FAILED", message: firstFailure?.error ?? "An operation failed.", recoverable: false };
  }
  return result;
}

export { isVerifiedSuccess };
