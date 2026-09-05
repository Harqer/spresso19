import assert from "node:assert/strict";
import test from "node:test";
import { streamSpressoChat } from "../lib/chatStream";

function sseResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { "Content-Type": "text/event-stream" } });
}

test("streams shopper text through the authenticated same-origin chat route", async () => {
  const requests: Array<{ url: string; options?: RequestInit }> = [];
  const received: string[] = [];

  await streamSpressoChat({
    prompt: "Find a burr grinder",
    locale: "en-US",
    fetcher: async (url, options) => {
      requests.push({ url, options });
      return sseResponse([
        'data: {"text":"Here are "}\n',
        '\ndata: {"text":"current listings."}\n\n',
        "data: [DONE]\n\n",
      ]);
    },
    onText: (text) => received.push(text),
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/chat/stream");
  assert.equal(requests[0].options?.method, "POST");
  assert.deepEqual(JSON.parse(String(requests[0].options?.body)), {
    prompt: "Find a burr grinder",
    locale: "en-US",
  });
  assert.deepEqual(received, ["Here are ", "current listings."]);
});

test("fails closed when the chat route rejects the request", async () => {
  await assert.rejects(
    streamSpressoChat({
      prompt: "Find a jacket",
      fetcher: async () => sseResponse([], 401),
      onText: () => assert.fail("no text should be emitted"),
    }),
    /Unable to start chat/,
  );
});
