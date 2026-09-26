/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { liveTokenRequestBody } from "./ai/liveToken";
import { requireFirebaseIdentity } from "./lib/identity";
import type { ActionCtx } from "./_generated/server";

const identity = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "live-token-user",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:live-token-user",
};

async function requestToken(
  ctx: Pick<ActionCtx, "auth" | "runAction">,
  exchange: () => Promise<{ token: string }>,
) {
  await requireFirebaseIdentity(ctx as ActionCtx);
  return exchange();
}

test("live-token exchange requires a verified Firebase identity", async () => {
  const unauthenticatedContext = {
    auth: { getUserIdentity: async () => null },
    runAction: async () => ({ token: "auth_tokens/ephemeral-test" }),
  } as unknown as Pick<ActionCtx, "auth" | "runAction">;
  await expect(requestToken(unauthenticatedContext, async () => ({ token: "unused" }))).rejects.toThrow(/Unauthenticated/i);

  const authenticatedContext = {
    auth: { getUserIdentity: async () => identity },
    runAction: async () => ({ token: "auth_tokens/ephemeral-test" }),
  } as unknown as Pick<ActionCtx, "auth" | "runAction">;
  await expect(requestToken(authenticatedContext, async () => ({ token: "auth_tokens/ephemeral-test" }))).resolves.toEqual({ token: "auth_tokens/ephemeral-test" });
});

test("live AuthToken request permits reconnect handles in the unlocked socket setup field", () => {
  const request = liveTokenRequestBody();
  expect(request.uses).toBe(1);
  expect(request.fieldMask).toBe("model,generationConfig,systemInstruction,tools,inputAudioTranscription,outputAudioTranscription");
  expect(request.bidiGenerateContentSetup).not.toHaveProperty("sessionResumption");
});
