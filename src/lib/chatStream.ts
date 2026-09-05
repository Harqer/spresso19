type ChatStreamRequest = {
  prompt: string;
  locale?: string;
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
  signal?: AbortSignal;
  onText: (text: string) => void;
};

type ChatStreamEvent = { text?: unknown };

export async function streamSpressoChat({
  prompt,
  locale,
  fetcher,
  signal,
  onText,
}: ChatStreamRequest): Promise<void> {
  const request = fetcher ?? (await import("./firebase")).authFetch;
  const response = await request("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(locale ? { prompt, locale } : { prompt }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Unable to start chat");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const emitEvent = (event: string) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!data || data === "[DONE]") return;

    let payload: ChatStreamEvent;
    try {
      payload = JSON.parse(data) as ChatStreamEvent;
    } catch {
      throw new Error("Invalid chat stream response");
    }
    if (typeof payload.text === "string" && payload.text) onText(payload.text);
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) emitEvent(event);

    if (done) break;
  }

  if (buffer.trim()) emitEvent(buffer);
}
