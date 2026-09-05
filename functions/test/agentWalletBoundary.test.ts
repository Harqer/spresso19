import assert from "node:assert/strict";
import test from "node:test";
import {
  createAgentWalletService,
  MAX_TRANSFER_TOKEN_CENTS,
  type CdpWalletPort,
} from "../src/payments/agentWallet";
import { db } from "../src/shared/db";

const TOKEN_CONTRACT = "0x1111111111111111111111111111111111111111";

type DocRecord = Record<string, unknown>;

function fakeDb(t: test.TestContext) {
  const docs = new Map<string, DocRecord>();
  const calls: { method: string; key: string; value?: DocRecord }[] = [];
  t.mock.method(db as any, "collection", (name: string) => ({
    doc: (key: string) => ({
      id: key,
      get: async () => {
        calls.push({ method: "get", key });
        const data = docs.get(`${name}/${key}`);
        return { exists: data !== undefined, data: () => data };
      },
      set: async (value: DocRecord, _opts?: unknown) => {
        calls.push({ method: "set", key, value });
        docs.set(`${name}/${key}`, { ...(docs.get(`${name}/${key}`) || {}), ...value });
      },
    }),
    get: async () => ({ docs: [], empty: true }),
  }));
  return { docs, calls };
}

function fakeCdp(t: test.TestContext, opts: { failTransfer?: boolean } = {}): CdpWalletPort & { transfers: unknown[] } {
  const transfers: unknown[] = [];
  return {
    transfers,
    getOrCreateAccount: async (name: string) => {
      assert.equal(name, "spresso-agent-wallet");
      return { address: "0xabc0000000000000000000000000000000000001", accountPolicy: "policy-123" };
    },
    transferToken: async (params) => {
      transfers.push(params);
      if (opts.failTransfer) throw new Error("CDP transfer rejected");
      return { transactionHash: "0xdeadbeef" };
    },
  };
}

const validPrepare = {
  destinationAddress: "0x9f663335cd6ad02a37b633602e98866cf944124d",
  amountTokenBaseUnits: "2500000", // 2.50 tokens at 6 decimals
  network: "base" as const,
  idempotencyKey: "12b9fc19-0f9a-472a-bb1c-a2e7d8954255",
};

function makeService(cdp: CdpWalletPort) {
  return createAgentWalletService(cdp, TOKEN_CONTRACT);
}

test("prepare stages a transfer without moving funds", async (t) => {
  const store = fakeDb(t);
  const cdp = fakeCdp(t);
  const service = makeService(cdp);

  const prepared = await service.prepareTransfer(validPrepare);

  assert.equal(prepared.status, "PREPARED");
  assert.equal(cdp.transfers.length, 0, "no funds may move during preparation");
  assert.equal(store.docs.size, 1);
  const record = store.docs.get(`walletTransfers/${validPrepare.idempotencyKey}`);
  assert.equal(record?.status, "PREPARED");
  assert.equal(record?.amountTokenBaseUnits, "2500000");
});

test("prepare is idempotent per idempotency key", async (t) => {
  fakeDb(t);
  const cdp = fakeCdp(t);
  const service = makeService(cdp);

  const first = await service.prepareTransfer(validPrepare);
  const second = await service.prepareTransfer(validPrepare);
  assert.equal(first.transferId, second.transferId);
  assert.equal(cdp.transfers.length, 0);
});

test("amounts above the spend cap are rejected before any CDP call", async (t) => {
  fakeDb(t);
  const cdp = fakeCdp(t);
  const service = makeService(cdp);

  await assert.rejects(
    service.prepareTransfer({
      ...validPrepare,
      amountTokenBaseUnits: String((MAX_TRANSFER_TOKEN_CENTS + 1) * 10_000), // one cent over cap, in base units
    }),
    /spend policy/,
  );
  assert.equal(cdp.transfers.length, 0);

  await assert.rejects(
    service.prepareTransfer({ ...validPrepare, amountTokenBaseUnits: "0" }),
    /spend policy/,
  );
});

test("execution without a user confirmation token is forbidden", async (t) => {
  fakeDb(t);
  const cdp = fakeCdp(t);
  const service = makeService(cdp);

  await assert.rejects(
    service.confirmAndExecuteTransfer({
      ...validPrepare,
      userConfirmationToken: "",
    }),
    /Explicit user confirmation/,
  );
  assert.equal(cdp.transfers.length, 0, "nothing may execute without explicit confirmation");
});

test("execution of an unprepared transfer is rejected and moves no funds", async (t) => {
  fakeDb(t);
  const cdp = fakeCdp(t);
  const service = makeService(cdp);

  await assert.rejects(
    service.confirmAndExecuteTransfer({
      ...validPrepare,
      userConfirmationToken: "user-confirmed-abc123",
    }),
    /No prepared transfer/,
  );
  assert.equal(cdp.transfers.length, 0);
});

test("confirmed execution moves funds exactly once with locked amount, destination, and token contract", async (t) => {
  fakeDb(t);
  const cdp = fakeCdp(t);
  const service = makeService(cdp);

  await service.prepareTransfer(validPrepare);
  const executed = await service.confirmAndExecuteTransfer({
    ...validPrepare,
    userConfirmationToken: "user-confirmed-abc123",
  });

  assert.equal(executed.status, "EXECUTED");
  assert.match(executed.transactionHash, /^0x/);
  assert.equal(cdp.transfers.length, 1);
  const transfer = cdp.transfers[0] as { to: string; amountBaseUnits: bigint; network: string; tokenContractAddress: string };
  assert.equal(transfer.to, validPrepare.destinationAddress);
  assert.equal(transfer.amountBaseUnits, BigInt(validPrepare.amountTokenBaseUnits));
  assert.equal(transfer.network, "base");
  assert.equal(transfer.tokenContractAddress, TOKEN_CONTRACT);
});

test("confirmation cannot alter the prepared amount or destination", async (t) => {
  fakeDb(t);
  const cdp = fakeCdp(t);
  const service = makeService(cdp);

  await service.prepareTransfer(validPrepare);
  await assert.rejects(
    service.confirmAndExecuteTransfer({
      ...validPrepare,
      amountTokenBaseUnits: "99000000", // 99 tokens — attempt to raise the amount at execution time
      userConfirmationToken: "user-confirmed-abc123",
    }),
    /do not match/,
  );
  assert.equal(cdp.transfers.length, 0);
});

test("a replayed confirmation does not transfer twice", async (t) => {
  const store = fakeDb(t);
  const cdp = fakeCdp(t);
  const service = makeService(cdp);

  await service.prepareTransfer(validPrepare);
  await service.confirmAndExecuteTransfer({ ...validPrepare, userConfirmationToken: "user-confirmed-abc123" });
  await assert.rejects(
    service.confirmAndExecuteTransfer({ ...validPrepare, userConfirmationToken: "user-confirmed-abc123" }),
    /No prepared transfer/,
  );
  assert.equal(cdp.transfers.length, 1, "replay must not move funds again");
  const record = store.docs.get(`walletTransfers/${validPrepare.idempotencyKey}`);
  assert.equal(record?.status, "EXECUTED");
});

test("audit log entries are written for prepare and execute", async (t) => {
  fakeDb(t);
  const cdp = fakeCdp(t);
  const service = makeService(cdp);

  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => logs.push(String(args[0]));
  t.after(() => {
    console.info = originalInfo;
  });

  await service.prepareTransfer(validPrepare);
  await service.confirmAndExecuteTransfer({ ...validPrepare, userConfirmationToken: "user-confirmed-abc123" });

  assert.ok(logs.some((line) => line === "agent-wallet.transfer.prepared"));
  assert.ok(logs.some((line) => line === "agent-wallet.transfer.executed"));
});
