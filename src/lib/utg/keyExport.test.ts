/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { encryptKeys, decryptKeys, plainExportKeys } from "./keyExport";
import type { UtgKey, UtgProviderId } from "./types";

// WebCrypto polyfill for jsdom
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import("node:crypto");
  (globalThis as unknown as { crypto: Crypto }).crypto = webcrypto as unknown as Crypto;
}

const sample = (): Record<UtgProviderId, UtgKey[]> => ({
  openai: [{ id: "a", value: "sk-test-123", status: "active" }],
  gemini: [], xai: [], deepseek: [], groq: [],
});

describe("UTG key export", () => {
  it("plain export contains the encrypted=false flag and key value", () => {
    const blob = plainExportKeys(sample());
    expect(blob).toContain("sk-test-123");
    expect(blob).toContain('"encrypted": false');
  });

  it("encrypted round-trip with correct passphrase recovers keys", async () => {
    const blob = await encryptKeys(sample(), "correct horse battery staple");
    expect(blob).not.toContain("sk-test-123");
    const back = await decryptKeys(blob, "correct horse battery staple");
    expect(back.openai[0].value).toBe("sk-test-123");
  });

  it("encrypted blob fails to decrypt with wrong passphrase", async () => {
    const blob = await encryptKeys(sample(), "right");
    await expect(decryptKeys(blob, "wrong")).rejects.toBeTruthy();
  });
});
