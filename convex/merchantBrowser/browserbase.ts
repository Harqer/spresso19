"use node";
/**
 * Browserbase session transport — the ONLY module that talks to Browserbase.
 *
 * Convex owns all durable workflow state (merchantBrowserSessions /
 * merchantBrowserEvents). Browserbase is only the execution provider:
 * one full-Chromium session per merchant workflow, driven over CDP by
 * playwright-core (see merchantBrowser/executor.ts).
 *
 * Credential discipline (architecture contract):
 *  - `connectUrl` is a credential-bearing transport value. It exists only as
 *    an in-memory return value of retrieveConnectUrl() for the executor's
 *    chromium.connectOverCDP() call in the same action invocation. It is
 *    NEVER persisted, logged, or placed in events or public payloads.
 *  - Only providerSessionId (a Browserbase session id) is ever stored in
 *    Convex.
 *
 * Provider credentials come from deployment env only (BROWSERBASE_API_KEY,
 * optional BROWSERBASE_PROJECT_ID) and are never exposed to clients.
 *
 * Contract tests replace `retrieveConnectUrl` and `createSession`/`releaseSession`
 * via the module-seam pattern used by merchantBrowserProvider.test.ts.
 */
import { env } from "../_generated/server";
import Browserbase from "@browserbasehq/sdk";

/** Bounded by the workflow TTL (20 min) per the architecture contract. */
const SESSION_TIMEOUT_SECONDS = 20 * 60;

export function browserbaseEnv(): { apiKey: string; projectId?: string } {
  const apiKey = env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Merchant browser automation is not configured in the Convex deployment (missing BROWSERBASE_API_KEY).");
  }
  const projectId = env.BROWSERBASE_PROJECT_ID;
  return projectId ? { apiKey, projectId } : { apiKey };
}

function client(): Browserbase {
  // The project id is inferred server-side from the API key when absent.
  return new Browserbase({ apiKey: browserbaseEnv().apiKey });
}

/**
 * Create a Browserbase session for a merchant workflow.
 *  - browserSettings.verified = true (verified full Chromium);
 *  - CAPTCHA auto-solving DISABLED: takeover by the user/credential broker is
 *    explicit, the agent must never silently solve challenges;
 *  - no persistent Context: fresh browser state per workflow;
 *  - session timeout bounded to the workflow TTL;
 *  - metadata attaches the Spresso session identity for platform-side audits.
 */
export async function createSession(params: {
  sessionId: string;
  tokenIdentifierHash: string;
  merchantHost: string;
  taskId?: string;
}): Promise<string> {
  const bb = client();
  const { projectId } = browserbaseEnv();
  const session = await bb.sessions.create({
    ...(projectId ? { projectId } : {}),
    browserSettings: {
      verified: true,
      solveCaptchas: false,
      // No `context` param: no persistent Browserbase Contexts in this pass.
    },
    api_timeout: SESSION_TIMEOUT_SECONDS,
    userMetadata: {
      // Identity hashes only — the raw token identifier never leaves Convex.
      spressoSessionId: params.sessionId,
      spressoSubjectHash: params.tokenIdentifierHash,
      spressoMerchantHost: params.merchantHost,
      spressoTaskId: params.taskId ?? "",
    },
  });
  return session.id;
}

/**
 * Retrieve the session and require a LIVE browser: status RUNNING plus a
 * connectUrl. The returned connectUrl is an in-memory credential for the
 * executor in the same action; callers must treat it as hot and never persist
 * it. Returns null-safe typed failures instead of leaking provider details.
 */
export async function retrieveConnectUrl(providerSessionId: string): Promise<string> {
  const bb = client();
  const session = await bb.sessions.retrieve(providerSessionId);
  if (!session || session.status !== "RUNNING") {
    throw new Error("The merchant browser session is no longer running.");
  }
  const connectUrl = session.connectUrl;
  if (!connectUrl) {
    throw new Error("The merchant browser session did not provide a live connection.");
  }
  return connectUrl;
}

/**
 * Short-lived interactive view URLs for explicit HITL takeover. Debug URLs are
 * sensitive session access: returned only to the session owner through the
 * authenticated live-view action, never persisted, logged, or embedded in
 * events.
 */
export async function getDebugUrls(providerSessionId: string): Promise<{ liveViewUrl: string; expiresInSeconds: number }> {
  const bb = client();
  const live = await bb.sessions.debug(providerSessionId);
  const liveViewUrl = live.debuggerFullscreenUrl || live.debuggerUrl;
  if (!liveViewUrl) throw new Error("Browserbase did not report an interactive view for this session.");
  return { liveViewUrl, expiresInSeconds: 300 };
}

/** Explicitly release the remote session at workflow end (completion/expiry/failure). */
export async function releaseSession(providerSessionId: string): Promise<void> {
  const bb = client();
  // REQUEST_RELEASE ends the session without charging for idle keep-alive;
  // an already-ended session surfaces as an API error we intentionally swallow.
  await bb.sessions.update(providerSessionId, { status: "REQUEST_RELEASE" }).catch(() => undefined);
}

/**
 * Explicit transport seam. In LOCAL mode the provider session registry inside
 * executor.ts owns the browser lifetime: create/translate to registry ops so
 * the local browser persists across actions exactly like a Browserbase
 * session, and release actually closes it.
 */
export const transport = {
  createSession,
  retrieveConnectUrl,
  getDebugUrls,
  releaseSession: async (providerSessionId: string): Promise<void> => {
    if (providerSessionId.startsWith("bb_local_")) {
      const { closeLocalExecutor } = await import("./executor");
      await closeLocalExecutor(providerSessionId);
      return;
    }
    await releaseSession(providerSessionId);
  },
};
