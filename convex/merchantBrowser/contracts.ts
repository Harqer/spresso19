/**
 * Canonical browser execution contracts (Phase 1).
 *
 * These types are the boundary between Convex durable orchestration
 * (merchantBrowser/{state,index,tools}.ts) and the browser executor runtime
 * (Phase 2: playwright-core connected to Browserbase over CDP). Convex owns
 * durable workflow state; the executor owns ephemeral browser execution and
 * is reachable only through these contracts.
 *
 * Non-negotiable semantics encoded here:
 *  - A state-changing operation that times out after dispatch is
 *    OUTCOME_UNKNOWN — never "failed" — because its true merchant-side effect
 *    may still have landed. The orchestrator must re-observe the browser and
 *    reconcile before any retry of a non-idempotent operation.
 *  - A batch is a success only when every operation is OK AND every
 *    postcondition assertion passed (`verified === true`). Recording an event
 *    is never evidence of success.
 *  - Raw CDP is a broker-only escape hatch: requests executed with AGENT
 *    authority MUST be rejected by the executor when they contain `cdp`
 *    operations (enforced by the Phase 2 runtime, declared here).
 *  - Credential-bearing transport values (CDP connectUrl, debug URLs, Live
 *    View URLs) NEVER appear in these contracts' persisted payloads; they are
 *    resolved in-memory per action from the provider by providerSessionId.
 */

/**
 * Exactly-one control owner per session status. Kept in lockstep with the
 * transition map in merchantBrowser/state.ts: a transition to a status
 * implicitly transfers control ownership to that status's owner, and every
 * transition writes controlOwner together with status so the pair can never
 * disagree.
 */
export const STATUS_CONTROL_OWNER: Record<string, "AGENT" | "USER" | "CREDENTIAL_BROKER" | "NONE"> = {
  STARTING: "NONE",
  ACTIVE: "AGENT",
  PAUSED: "NONE",
  WAITING_USER_INPUT: "USER",
  WAITING_SECURE_INPUT: "CREDENTIAL_BROKER",
  HANDOFF_REQUIRED: "AGENT",
  HUMAN_CONTROL: "USER",
  RESUMING: "AGENT",
  READY_FOR_PURCHASE_AUTHORIZATION: "NONE",
  SUBMITTING_PURCHASE: "AGENT",
  COMPLETED: "NONE",
  FAILED: "NONE",
  EXPIRED: "NONE",
};

export type MerchantSessionStatus = keyof typeof STATUS_CONTROL_OWNER;
export type ControlOwner = "AGENT" | "USER" | "CREDENTIAL_BROKER" | "NONE";

/** Outcome of one operation or a whole execution batch. */
export type BrowserOperationOutcome =
  /** Operation completed and its effect was observed. */
  | "OK"
  /** Operation completed and was observed NOT to have the requested effect. */
  | "FAILED"
  /** Operation was not attempted (an earlier operation in the batch failed). */
  | "SKIPPED"
  /**
   * The operation was dispatched to the browser but its completion was not
   * observed before the timeout. The merchant-side effect is UNKNOWN: it may
   * have succeeded. Callers must re-observe and reconcile; automatic retry of
   * non-idempotent operations on OUTCOME_UNKNOWN is forbidden.
   */
  | "OUTCOME_UNKNOWN";

/** True when the outcome leaves the merchant-side effect undetermined. */
export function isOutcomeUnknown(outcome: BrowserOperationOutcome): boolean {
  return outcome === "OUTCOME_UNKNOWN";
}

/**
 * Locator targets for browser operations. Semantic/a11y locators are the
 * primary contract; structural selectors are the explicit fallback, and
 * coordinate/vision targeting is deliberately absent from this pass.
 */
export type BrowserLocatorTarget =
  | { kind: "role"; role: string; name?: string; exact?: boolean }
  | { kind: "label"; label: string; exact?: boolean }
  | { kind: "text"; text: string; exact?: boolean }
  | { kind: "placeholder"; placeholder: string; exact?: boolean }
  | { kind: "altText"; alt: string; exact?: boolean }
  | { kind: "title"; title: string; exact?: boolean }
  | { kind: "testId"; testId: string }
  | { kind: "css"; selector: string }
  | { kind: "xpath"; expression: string };

/** Scope an operation to a frame inside the page (iframes support). */
export type BrowserFrameScope = {
  /** Frame URL glob or locator for the frame element that embeds it. */
  url?: string;
  target?: BrowserLocatorTarget;
  /** Nested frames, outermost first. */
  nested?: Array<{ url?: string; target?: BrowserLocatorTarget }>;
};

/** Keyboard/button modifiers for click-class operations. */
export type BrowserClickOptions = {
  button?: "left" | "right" | "middle";
  /** 2 encodes a double click; higher counts are multi-clicks. */
  clickCount?: number;
  modifiers?: Array<"Alt" | "Control" | "Meta" | "Shift">;
};

/**
 * Typed browser operations covering the required surface: navigation,
 * semantic interaction, keyboard/mouse, form controls, hover/scroll/drag,
 * iframes, tabs/popups, uploads/downloads, evaluate, screenshots,
 * accessibility/DOM/network observations, and the broker-only CDP escape.
 */
export type BrowserOperation =
  /** Navigate the scoped page; waitUntil governs the settle point. */
  | { op: "navigate"; url: string; waitUntil?: "load" | "domcontentloaded" | "networkidle"; timeoutMs?: number }
  /** Click / double click (clickCount: 2) / right click a target. */
  | { op: "click"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; options?: BrowserClickOptions; timeoutMs?: number }
  /** Clear and set a form field value in one committed action. */
  | { op: "fill"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; value: string; timeoutMs?: number }
  /** Send raw keystrokes into a focused/focusable target. */
  | { op: "type"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; value: string; delayMs?: number; timeoutMs?: number }
  /** Press a keyboard key (optionally on a target). */
  | { op: "press"; key: string; target?: BrowserLocatorTarget; frame?: BrowserFrameScope; timeoutMs?: number }
  /** Select one or more options on a <select> control. */
  | { op: "selectOption"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; values: string[]; timeoutMs?: number }
  /** Set or clear a checkbox/radio state. */
  | { op: "setChecked"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; checked: boolean; timeoutMs?: number }
  /** Hover a target (tooltip/menu reveals). */
  | { op: "hover"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; timeoutMs?: number }
  /** Scroll the scoped page or a scrollable target. */
  | { op: "scroll"; direction: "up" | "down" | "left" | "right"; amountPx: number; target?: BrowserLocatorTarget; frame?: BrowserFrameScope }
  /** Drag from one target to another. */
  | { op: "drag"; from: BrowserLocatorTarget; to: BrowserLocatorTarget; frame?: BrowserFrameScope; timeoutMs?: number }
  /** Stage broker-held files into a file input (uploads). */
  | { op: "uploadFiles"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; fileRefIds: string[]; timeoutMs?: number }
  /** Wait for a target/page state (reveals, spinners, SPA settle). */
  | { op: "waitFor"; target?: BrowserLocatorTarget; frame?: BrowserFrameScope; state?: "visible" | "hidden" | "attached" | "detached"; urlPattern?: string; timeoutMs?: number }
  /** Move focus between open tabs/windows/popups. */
  | { op: "switchTab"; match: { urlPattern?: string; index?: number }; timeoutMs?: number }
  /** Close a tab/window/popup by match (the last page cannot be closed). */
  | { op: "closeTab"; match: { urlPattern?: string; index?: number }; timeoutMs?: number }
  /** Run JS in the page context and return a JSON-serializable value. */
  | { op: "evaluate"; expression: string; arg?: unknown; timeoutMs?: number }
  /** Capture a screenshot evidence artifact (returns a broker-staged ref). */
  | { op: "screenshot"; fullPage?: boolean; timeoutMs?: number }
  /** Observe the page: accessibility tree summary, targeted DOM facts, network log. */
  | { op: "observe"; include?: Array<"a11y" | "dom" | "network">; target?: BrowserLocatorTarget; frame?: BrowserFrameScope }
  /**
   * Raw CDP escape hatch. BROKER-ONLY: the executor MUST reject this
   * operation for AGENT-authority requests. Administrative CDP methods that
   * would disable Spresso policy enforcement are additionally forbidden even
   * for the broker (runtime enforcement, Phase 2).
   */
  | { op: "cdp"; method: string; params?: Record<string, unknown>; sessionId?: string; timeoutMs?: number };

/**
 * Broker-staged file handle. The credential broker materializes user-approved
 * files into the staging area and hands only opaque refs to the agent; the
 * executor resolves refs to bytes at upload time. Produced artifacts
 * (downloads, screenshots) are written back as refs — never inline bytes in
 * results, which stay compact and credential-free.
 */
export type FileRef = { refId: string; name: string; sizeBytes: number; mediaType?: string };

export type FileStagingArea = {
  /** Resolve a staged ref to bytes (uploads). Undefined = unknown ref. */
  read(refId: string): Promise<{ name: string; mediaType?: string; bytes: Uint8Array } | undefined>;
  /** Persist produced bytes (downloads/screenshots) and return a ref. */
  write(file: { name: string; mediaType?: string; bytes: Uint8Array }): Promise<FileRef>;
  /** Max bytes accepted per file; larger transfers are refused. */
  maxFileBytes: number;
};

/** Postcondition assertions — the only accepted success evidence. */
export type BrowserAssertion =
  | { type: "urlMatches"; pattern: string }
  | { type: "urlHostEquals"; host: string }
  | { type: "titleContains"; text: string }
  | { type: "elementVisible"; target: BrowserLocatorTarget; frame?: BrowserFrameScope }
  | { type: "elementHidden"; target: BrowserLocatorTarget; frame?: BrowserFrameScope }
  | { type: "elementTextEquals"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; expected: string }
  | { type: "elementTextMatches"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; pattern: string }
  | { type: "elementCount"; target: BrowserLocatorTarget; frame?: BrowserFrameScope; equals?: number; min?: number; max?: number }
  | { type: "evaluateTruthy"; expression: string }
  | { type: "evaluateEquals"; expression: string; expected: unknown };

/** Who the executor acts as for this batch. AGENT batches may not contain `cdp`. */
export type BrowserExecutionAuthority = "AGENT" | "CREDENTIAL_BROKER";

/** One batch of dependent operations executed against a live browser session. */
export type BrowserExecutionRequest = {
  /** Unique id for tracing/idempotency of this batch. */
  executionId: string;
  /** Durable session record id (orchestration layer). */
  sessionId: string;
  /** Provider session handle. The executor resolves the credential-bearing
   *  connectUrl from this per action; it is never carried in the request. */
  providerSessionId: string;
  /** Policy scope: observations/landings outside this host are escapes. */
  merchantHost: string;
  authority: BrowserExecutionAuthority;
  /** Executed in order; first hard failure skips the remainder. */
  operations: BrowserOperation[];
  /** Postconditions evaluated after the operations; all must pass. */
  assertions?: BrowserAssertion[];
  /**
   * Waiters armed BEFORE the first operation (waiter-before-trigger: popups
   * and downloads are captured even when the triggering click resolves them
   * synchronously). Response patterns are network observations, not waits.
   */
  armWaiters?: { popups?: boolean; downloads?: boolean; responseUrlPatterns?: string[] };
  /**
   * Broker-staged files for uploadFiles operations. Required by any batch
   * containing uploadFiles; AGENT batches must receive empty-file checks via
   * the broker staging area (the agent itself never holds raw bytes).
   */
  stagedFiles?: FileStagingArea;
  /** Whole-batch budget in milliseconds (default 20s). */
  timeoutMs?: number;
  /** Semantic currentStep to stamp on the durable session if verified. */
  step?: string;
};

/** Compact per-operation result (no DOM dumps, no provider transport values). */
export type BrowserOperationResult = {
  index: number;
  op: BrowserOperation["op"];
  outcome: BrowserOperationOutcome;
  /** Short sanitized reason for FAILED/OUTCOME_UNKNOWN (no provider URLs). */
  error?: string;
  durationMs?: number;
  /** JSON-serializable return value of `evaluate` operations, bounded to 2KB
   *  serialized — bounded evidence used by provider-side postcondition math
   *  (e.g. cart badge before/after counts). Never transport credentials. */
  value?: unknown;
};

/** Compact structured result for one execution batch. */
export type BrowserExecutionResult = {
  executionId: string;
  outcome: BrowserOperationOutcome;
  /** True ONLY when outcome is OK and every requested assertion passed. */
  verified: boolean;
  operations: BrowserOperationResult[];
  /** Post-action observation of the scoped page. */
  observation?: {
    currentUrl: string;
    pageTitle?: string;
    /** a11y-tree summary or targeted DOM facts, never a full DOM dump. */
    summary?: string;
    network?: Array<{ url: string; status: number }>;
  };
  /** Popups/tabs opened by the batch (matched via armWaiters.popups). */
  popupsOpened?: number;
  /** Download artifact refs produced by the batch. */
  downloadRefs?: string[];
  /** Screenshot artifact refs produced by the batch. */
  screenshotRefs?: string[];
  /** Structured failure for FAILED/OUTCOME_UNKNOWN batches. */
  failure?: {
    code: string;
    message: string;
    /** True when a bounded re-observe/reconcile may recover the batch. */
    recoverable: boolean;
  };
};

/** A batch that may be reported as success to tools/users. */
export function isVerifiedSuccess(result: BrowserExecutionResult): boolean {
  return result.verified && result.outcome === "OK" && !isOutcomeUnknown(result.outcome);
}

/**
 * Reconciliation contract for a timed-out state-changing operation: the
 * orchestrator re-observes the browser and must treat the operation as
 * unreconciled until a fresh observation decides OK or FAILED. Retrying the
 * original operation before reconciliation is forbidden.
 */
export type OutcomeUnknownReconciliation = {
  executionId: string;
  operationIndex: number;
  /** Fresh post-timeout observation used to decide the true effect. */
  reObservation: NonNullable<BrowserExecutionResult["observation"]>;
  /** Decided effect after reconciliation (never OUTCOME_UNKNOWN again). */
  resolvedOutcome: "OK" | "FAILED";
};
