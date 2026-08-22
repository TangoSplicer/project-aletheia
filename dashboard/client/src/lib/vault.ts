/**
 * Client-side vault encryption and restoration. Vault phrases and decrypted evidence
 * remain in browser memory or session-only navigation state; they never reach the server.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const RESTORED_VAULT_KEY = "aletheia-restored-vault";

export type RestoredVaultPayload = {
  manifest: Record<string, unknown>;
  ledgerEntries: Array<Record<string, unknown>>;
  verification?: Record<string, unknown>;
};

type VaultFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function toBase64(value: Uint8Array<ArrayBuffer>): string {
  let binary = "";
  value.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function isRestoredVaultPayload(value: unknown): value is RestoredVaultPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return Boolean(payload.manifest && typeof payload.manifest === "object" && !Array.isArray(payload.manifest) && Array.isArray(payload.ledgerEntries));
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const baseKey = await globalThis.crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return globalThis.crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 310_000 },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptVaultPayload(payload: unknown, passphrase: string) {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable in this browser.");
  const plainText = JSON.stringify(payload);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipherBuffer = await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plainText));
  return { encryptedPayload: toBase64(new Uint8Array(cipherBuffer)), encryptionSalt: toBase64(salt), encryptionIv: toBase64(iv), contentDigest: await sha256Hex(plainText) };
}

export async function decryptVaultPayload<T>(encryptedPayload: string, encryptionSalt: string, encryptionIv: string, passphrase: string): Promise<T> {
  const key = await deriveKey(passphrase, fromBase64(encryptionSalt));
  const plainBuffer = await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(encryptionIv) }, key, fromBase64(encryptedPayload));
  return JSON.parse(decoder.decode(plainBuffer)) as T;
}

/** Fetches an authenticated ciphertext artifact and validates its digest after local decryption. */
export async function restoreVaultArtifact(
  encryptedPayloadUrl: string,
  encryptionSalt: string,
  encryptionIv: string,
  contentDigest: string,
  passphrase: string,
  request: VaultFetch = fetch,
): Promise<RestoredVaultPayload> {
  const response = await request(encryptedPayloadUrl, { credentials: "same-origin" });
  if (!response.ok) throw new Error("The encrypted vault artifact could not be retrieved.");
  const ciphertext = await response.text();
  const restored = await decryptVaultPayload<unknown>(ciphertext, encryptionSalt, encryptionIv, passphrase);
  if (!isRestoredVaultPayload(restored)) throw new Error("The decrypted vault does not match the Aletheia case format.");
  if (await sha256Hex(JSON.stringify(restored)) !== contentDigest) throw new Error("The decrypted vault digest does not match the saved case record.");
  return restored;
}

/** Decrypted case data is available only for the current navigation and is consumed once. */
export function queueRestoredVault(payload: RestoredVaultPayload) {
  sessionStorage.setItem(RESTORED_VAULT_KEY, JSON.stringify(payload));
}

export function takeRestoredVault(): RestoredVaultPayload | null {
  const stored = sessionStorage.getItem(RESTORED_VAULT_KEY);
  sessionStorage.removeItem(RESTORED_VAULT_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as unknown;
    return isRestoredVaultPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function hashCaseReference(caseId: string): Promise<string> {
  return sha256Hex(caseId);
}
