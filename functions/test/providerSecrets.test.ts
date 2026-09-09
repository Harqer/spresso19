import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSecretPresence,
  loadProviderSecrets,
  ProviderSecretConfigurationError,
} from "../src/config/providerSecrets";

const secretNames = [
  "NVIDIA_API_KEY",
  "GEMINI_API_KEY",
  "HIGGSFIELD_API_KEY_ID",
  "HIGGSFIELD_KEY_SECRET",
] as const;

const originalEnvironment = Object.fromEntries(
  secretNames.map((name) => [name, process.env[name]]),
);

function clearProviderEnvironment(): void {
  for (const name of secretNames) delete process.env[name];
}

test.beforeEach(clearProviderEnvironment);
test.afterEach(() => {
  clearProviderEnvironment();
  for (const name of secretNames) {
    const value = originalEnvironment[name];
    if (value !== undefined) process.env[name] = value;
  }
});

test("reports presence without returning credential material", async () => {
  process.env.NVIDIA_API_KEY = "configured-nvidia";
  process.env.HIGGSFIELD_API_KEY_ID = "configured-media-id";
  process.env.HIGGSFIELD_KEY_SECRET = "configured-media-secret";

  assert.deepEqual(await assertSecretPresence(), { nvidia: true, mediaFallback: true });
});

test("requires the NVIDIA credential", async () => {
  process.env.GEMINI_API_KEY = "configured-gemini";

  await assert.rejects(
    loadProviderSecrets(),
    (error: unknown) => {
      assert.ok(error instanceof ProviderSecretConfigurationError);
      assert.deepEqual(error.missing, ["NVIDIA_API_KEY"]);
      assert.match(error.message, /NVIDIA_API_KEY/);
      assert.equal(error.message.includes("configured-gemini"), false);
      return true;
    },
  );
});

test("resolves optional credentials and never includes them in configuration errors", async () => {
  process.env.NVIDIA_API_KEY = "configured-nvidia";
  process.env.GEMINI_API_KEY = "configured-gemini";
  process.env.HIGGSFIELD_API_KEY_ID = "configured-media-id";
  process.env.HIGGSFIELD_KEY_SECRET = "configured-media-secret";

  const resolved = await loadProviderSecrets();
  assert.deepEqual(resolved, {
    nvidiaApiKey: "configured-nvidia",
    geminiApiKey: "configured-gemini",
    higgsfieldKeyId: "configured-media-id",
    higgsfieldKeySecret: "configured-media-secret",
  });

  clearProviderEnvironment();
  await assert.rejects(loadProviderSecrets(), (error: unknown) => {
    assert.ok(error instanceof ProviderSecretConfigurationError);
    for (const value of Object.values(resolved)) {
      assert.equal(error.message.includes(value), false);
    }
    return true;
  });
});
