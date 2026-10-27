// Encrypted API key export/import using WebCrypto AES-GCM with PBKDF2 passphrase.
import { UtgKey, UtgProviderId } from "./types";

const ITER = 200_000;

function toBuf(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    toBuf(new TextEncoder().encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toBuf(salt), iterations: ITER, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export async function encryptKeys(keys: Record<UtgProviderId, UtgKey[]>, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = toBuf(new TextEncoder().encode(JSON.stringify(keys)));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: toBuf(iv) }, key, data));
  return JSON.stringify({ v: 1, alg: "AES-GCM", iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) }, null, 2);
}

export async function decryptKeys(blob: string, passphrase: string): Promise<Record<UtgProviderId, UtgKey[]>> {
  const j = JSON.parse(blob);
  if (j.v !== 1) throw new Error("Unsupported export version");
  const key = await deriveKey(passphrase, fromB64(j.salt));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBuf(fromB64(j.iv)) },
    key,
    toBuf(fromB64(j.data)),
  );
  return JSON.parse(new TextDecoder().decode(pt));
}

export function plainExportKeys(keys: Record<UtgProviderId, UtgKey[]>): string {
  return JSON.stringify({ v: 1, encrypted: false, keys }, null, 2);
}
