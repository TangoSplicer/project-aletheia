/**
 * Aletheia verification primitives. These functions operate entirely in the browser:
 * no manifest, public key, signature, or ledger is sent to an external service.
 */
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type SealManifest = {
  case_id?: string;
  practitioner_id?: string;
  timestamp?: string;
  ledger_root_hash?: string;
  digital_signature?: string;
  signing?: { algorithm?: string; public_key?: string; signature?: string };
  [key: string]: unknown;
};

export type SignatureState = "verified" | "failed" | "unavailable" | "checking";
export type SignatureResult = { state: SignatureState; message: string; signerFingerprint?: string; signerKeyDigest?: string };

export type LedgerEntry = {
  sequence_id: number;
  timestamp: string;
  event_type: string;
  actor: string;
  object_ref: string;
  detail_hash: string;
  previous_hash: string;
  entry_hash: string;
};

export type LedgerResult = {
  state: "verified" | "failed" | "unavailable";
  message: string;
  rootHash?: string;
  validEntries: number;
  totalEntries: number;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stableValue(nested)]));
  }
  return value;
}

/** Canonical JSON contract: recursively sorted keys, UTF-8 bytes, signing envelope omitted. */
export function canonicalizeManifest(manifest: SealManifest): string {
  const { signing: _signing, digital_signature: _legacySignature, ...unsignedManifest } = manifest;
  return JSON.stringify(stableValue(unsignedManifest));
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function encodeBase64(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fingerprint(bytes: Uint8Array): string {
  const digest = bytesToHex(blake3(bytes));
  return `b3:${digest.slice(0, 12)}…${digest.slice(-8)}`;
}

function keyDigest(bytes: Uint8Array): string {
  return bytesToHex(blake3(bytes));
}

function webCryptoBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const normalized = new Uint8Array(bytes.byteLength);
  normalized.set(bytes);
  return normalized;
}

export async function verifyManifestSignature(manifest: SealManifest): Promise<SignatureResult> {
  const envelope = manifest.signing;
  if (!envelope?.public_key || !envelope.signature) {
    return { state: "unavailable", message: "No trusted Ed25519 signing envelope is present. A legacy signature reference alone cannot be verified." };
  }
  if ((envelope.algorithm ?? "Ed25519").toLowerCase() !== "ed25519") {
    return { state: "unavailable", message: `Unsupported signature algorithm: ${envelope.algorithm ?? "unspecified"}.` };
  }
  try {
    const publicKey = decodeBase64(envelope.public_key);
    const signature = decodeBase64(envelope.signature);
    if (publicKey.byteLength !== 32 || signature.byteLength !== 64) return { state: "failed", message: "Ed25519 key or signature length is invalid." };
    if (!globalThis.crypto?.subtle) return { state: "unavailable", message: "This browser does not expose Web Crypto for Ed25519 verification." };
    const key = await globalThis.crypto.subtle.importKey("raw", webCryptoBytes(publicKey), { name: "Ed25519" }, false, ["verify"]);
    const valid = await globalThis.crypto.subtle.verify({ name: "Ed25519" }, key, webCryptoBytes(signature), webCryptoBytes(utf8ToBytes(canonicalizeManifest(manifest))));
    return valid
      ? { state: "verified", message: "Ed25519 signature verifies against the canonical manifest payload.", signerFingerprint: fingerprint(publicKey), signerKeyDigest: keyDigest(publicKey) }
      : { state: "failed", message: "Signature does not match the canonical manifest payload.", signerFingerprint: fingerprint(publicKey), signerKeyDigest: keyDigest(publicKey) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown Web Crypto error";
    return { state: "unavailable", message: `Signature verification could not run: ${detail}` };
  }
}

export function ledgerHash(entry: Pick<LedgerEntry, "sequence_id" | "previous_hash" | "event_type" | "object_ref" | "detail_hash">): string {
  return bytesToHex(blake3(utf8ToBytes(`${entry.sequence_id}${entry.previous_hash}${entry.event_type}${entry.object_ref}${entry.detail_hash}`)));
}

export function inspectLedger(entries: LedgerEntry[]): LedgerResult {
  if (!entries.length) return { state: "unavailable", message: "No ledger entries were supplied.", validEntries: 0, totalEntries: 0 };
  let expectedPrevious = "GENESIS";
  let expectedSequence = 1;
  for (const entry of entries) {
    if (entry.sequence_id !== expectedSequence) return { state: "failed", message: `Sequence discontinuity at entry ${entry.sequence_id}; expected ${expectedSequence}.`, validEntries: expectedSequence - 1, totalEntries: entries.length };
    if (entry.previous_hash !== expectedPrevious) return { state: "failed", message: `Previous-hash discontinuity at entry ${entry.sequence_id}.`, validEntries: expectedSequence - 1, totalEntries: entries.length };
    if (entry.entry_hash !== ledgerHash(entry)) return { state: "failed", message: `Entry-hash mismatch at entry ${entry.sequence_id}.`, validEntries: expectedSequence - 1, totalEntries: entries.length };
    expectedPrevious = entry.entry_hash;
    expectedSequence += 1;
  }
  return { state: "verified", message: `${entries.length} ledger entr${entries.length === 1 ? "y" : "ies"} recomputed successfully.`, rootHash: expectedPrevious, validEntries: entries.length, totalEntries: entries.length };
}

export function parseLedgerDocument(raw: string): LedgerEntry[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parsed = trimmed.startsWith("[") ? JSON.parse(trimmed) : trimmed.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  if (!Array.isArray(parsed)) throw new Error("Ledger must be a JSON array or JSONL document.");
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw new Error(`Ledger entry ${index + 1} is not an object.`);
    const value = entry as Record<string, unknown>;
    const needed = ["sequence_id", "timestamp", "event_type", "actor", "object_ref", "detail_hash", "previous_hash", "entry_hash"];
    if (needed.some(key => value[key] === undefined)) throw new Error(`Ledger entry ${index + 1} is missing required fields.`);
    return value as unknown as LedgerEntry;
  });
}

export async function createDemonstrationBundle(): Promise<{ manifest: SealManifest; ledger: LedgerEntry[] }> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable in this browser.");
  const caseId = "ALT-2026-0142";
  const practitionerId = "PRACTITIONER-UK-204";
  const unsignedManifest: SealManifest = { case_id: caseId, practitioner_id: practitionerId, timestamp: "2026-08-13T09:45:02Z", ledger_root_hash: "" };
  const firstEntry: LedgerEntry = { sequence_id: 1, timestamp: "2026-08-13T09:41:00Z", event_type: "PRACTITIONER_ATTESTATION", actor: practitionerId, object_ref: caseId, detail_hash: "demo-attestation-payload", previous_hash: "GENESIS", entry_hash: "" };
  firstEntry.entry_hash = ledgerHash(firstEntry);
  const secondEntry: LedgerEntry = { sequence_id: 2, timestamp: "2026-08-13T09:45:02Z", event_type: "CASE_SEALED", actor: practitionerId, object_ref: caseId, detail_hash: firstEntry.entry_hash, previous_hash: firstEntry.entry_hash, entry_hash: "" };
  secondEntry.entry_hash = ledgerHash(secondEntry);
  const ledger = [firstEntry, secondEntry];
  unsignedManifest.ledger_root_hash = secondEntry.entry_hash;
  const keyPair = await globalThis.crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const signature = await globalThis.crypto.subtle.sign({ name: "Ed25519" }, keyPair.privateKey, webCryptoBytes(utf8ToBytes(canonicalizeManifest(unsignedManifest))));
  const publicKey = await globalThis.crypto.subtle.exportKey("raw", keyPair.publicKey);
  return { manifest: { ...unsignedManifest, signing: { algorithm: "Ed25519", public_key: encodeBase64(publicKey), signature: encodeBase64(signature) } }, ledger };
}
