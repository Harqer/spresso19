import { lookup } from "node:dns/promises";

/**
 * OpenClaw controlled browser/research capability.
 *
 * Public web retrieval is intentionally broader than a merchant allowlist, but
 * it is never unrestricted network access: HTTPS is required, DNS targets are
 * checked against private/metadata ranges, redirects are not followed, bodies
 * are bounded, and retrieved content is marked untrusted. Authorization and
 * tool selection remain outside this module.
 */

const MAX_PAGE_BYTES = 512 * 1024;
const MAX_TEXT_CHARS = 20_000;
const FETCH_TIMEOUT_MS = 15_000;

export type BrowserToolContext = { uid: string; correlationId: string };
type GuardrailsDecision = { allowed: boolean; reason?: string };
type ToolCall = BrowserToolContext & { toolName: string; toolCallId: string; arguments: Record<string, unknown> };
type ToolResult = BrowserToolContext & { toolName: string; toolCallId: string; content: string; knownCallIds: string[] };

type BrowserDeps = {
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<Array<{ address: string; family: number }>>;
  validateToolCall?: (call: ToolCall) => Promise<GuardrailsDecision>;
  validateToolResult?: (result: ToolResult) => Promise<GuardrailsDecision>;
};

function configuredHosts(): Set<string> {
  return new Set(
    (process.env.SPRESSO_OPENCLAW_ALLOWED_PAGE_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function requireContext(context: BrowserToolContext | undefined): BrowserToolContext {
  if (!context || typeof context.uid !== "string" || context.uid.trim().length === 0 || context.uid.length > 200 || typeof context.correlationId !== "string" || context.correlationId.trim().length === 0 || context.correlationId.length > 200) {
    throw new Error("Trusted application context is required.");
  }
  return { uid: context.uid.trim(), correlationId: context.correlationId.trim() };
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.") || normalized.startsWith("::ffff:169.254.");
}

function isPrivateAddress(address: string): boolean {
  return address.includes(":") ? isPrivateIpv6(address) : isPrivateIpv4(address);
}

async function assertPublicDestination(parsed: URL, resolveHost: NonNullable<BrowserDeps["resolveHost"]>): Promise<void> {
  if (parsed.username || parsed.password || parsed.port) throw new Error("Product page URL contains forbidden authority data.");
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal" || hostname.endsWith(".internal") || isPrivateAddress(hostname)) {
    throw new Error("Private destinations are not allowed.");
  }
  const configured = configuredHosts();
  if (configured.size > 0 && !configured.has(hostname)) throw new Error("Host is not on the read allowlist.");
  const addresses = await resolveHost(hostname);
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Private destinations are not allowed.");
}

function stripMarkup(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--\s*[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function readLimited(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_PAGE_BYTES) throw new Error("Product page is too large to read.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Product page response has no body.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > MAX_PAGE_BYTES) {
        await reader.cancel();
        throw new Error("Product page is too large to read.");
      }
      chunks.push(next.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function assertDecision(decision: GuardrailsDecision | undefined): void {
  if (!decision || typeof decision.allowed !== "boolean") throw new Error("Tool policy returned an invalid decision.");
  if (!decision.allowed) throw new Error("The requested action was blocked by policy.");
}

async function validateResult(deps: BrowserDeps, result: ToolResult): Promise<void> {
  if (!deps.validateToolResult) throw new Error("Tool result policy is not configured.");
  assertDecision(await deps.validateToolResult(result));
}

export function createBrowserTools(deps: BrowserDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const resolveHost = deps.resolveHost ?? (async (hostname: string) => lookup(hostname, { all: true }));

  return {
    async readProductPage(input: { url: string }, rawContext?: BrowserToolContext): Promise<{ url: string; title: string; text: string; truncated: boolean; untrusted: true }> {
      const context = requireContext(rawContext);
      if (!input || typeof input.url !== "string") throw new Error("A product page URL is required.");
      let parsed: URL;
      try {
        parsed = new URL(input.url);
      } catch {
        throw new Error("A valid product page URL is required.");
      }
      if (parsed.protocol !== "https:") throw new Error("Product pages must use HTTPS.");
      await assertPublicDestination(parsed, resolveHost);

      const toolCallId = `${context.correlationId}:read_product_page`;
      assertDecision(await deps.validateToolCall?.({ ...context, toolName: "read_product_page", toolCallId, arguments: { url: parsed.toString() } }));
      const response = await fetchImpl(parsed.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { accept: "text/html,application/xhtml+xml" },
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error("Redirected product pages are not allowed.");
      }
      if (!response.ok) throw new Error("Product page could not be retrieved.");
      const contentType = response.headers.get("content-type") || "";
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error("Unsupported page content type.");
      const html = new TextDecoder().decode(await readLimited(response));
      const fullText = stripMarkup(html);
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const result = {
        url: parsed.toString(),
        title: stripMarkup(titleMatch?.[1] ?? "").slice(0, 300),
        text: fullText.slice(0, MAX_TEXT_CHARS),
        truncated: fullText.length > MAX_TEXT_CHARS,
        untrusted: true as const,
      };
      await validateResult(deps, {
        ...context,
        toolName: "read_product_page",
        toolCallId,
        content: JSON.stringify(result),
        knownCallIds: [toolCallId],
      });
      return result;
    },
  };
}
