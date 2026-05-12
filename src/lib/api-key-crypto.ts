/**
 * AES-GCM + PBKDF2 encryption for stored Headscale API keys.
 *
 * Threat model:
 *   This module raises the cost of *static* exfiltration of stored API keys, defending against:
 *     - localStorage / cloud-sync / backup files being read off disk
 *     - browser extensions that scrape storage
 *     - offline forensics without root / OS keychain access
 *   It does NOT defend against:
 *     - active XSS on the same origin (the attacker can just call decryptApiKey themselves)
 *     - a fully compromised device / browser process
 *     - an attacker who knows the user's passphrase or browser master password
 *   For stronger protection, proxy the API through a server and use HttpOnly cookies.
 */

import { idbDelete, idbGet, idbPut, STORE_KEYS, STORE_META } from "./idb";

export const DEVICE_KEY_ID = "device-key";
export const CANARY_KEY_ID = "password-canary";

const CANARY_PLAINTEXT = "headscale-ui:canary:v1";
const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_HASH = "SHA-256";
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
export const CANARY_SALT_LENGTH = 32;
export const PBKDF2_DEFAULT_ITERATIONS = PBKDF2_ITERATIONS;

export type ApiKeySecret =
  | { v: 1; scheme: "device"; iv: string; ct: string }
  | { v: 1; scheme: "password"; iv: string; ct: string };

export class DeviceKeyPersistError extends Error {
  constructor(cause?: unknown) {
    super("Failed to persist device key to IndexedDB");
    this.name = "DeviceKeyPersistError";
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function isEncryptedApiKey(value: unknown): value is ApiKeySecret {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.v === 1 &&
    (v.scheme === "device" || v.scheme === "password") &&
    typeof v.iv === "string" &&
    typeof v.ct === "string"
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(length));
  crypto.getRandomValues(out);
  return out;
}

export function generateCanarySalt(): Uint8Array<ArrayBuffer> {
  return randomBytes(CANARY_SALT_LENGTH);
}

/**
 * Returns the persisted device-bound AES-GCM key, generating + storing one on first use.
 * Throws DeviceKeyPersistError if idbPut fails — never returns an in-memory-only key,
 * otherwise the next page load would generate a fresh key and silently brick every
 * profile encrypted with the previous one.
 */
export async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  const existing = await idbGet<CryptoKey>(STORE_KEYS, DEVICE_KEY_ID);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: AES_KEY_LENGTH }, false, [
    "encrypt",
    "decrypt",
  ]);
  try {
    await idbPut(STORE_KEYS, key, DEVICE_KEY_ID);
  } catch (err) {
    throw new DeviceKeyPersistError(err);
  }
  console.info("[headscale-ui] device key generated");
  return key;
}

export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: PBKDF2_HASH },
    baseKey,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptApiKey(
  plain: string,
  key: CryptoKey,
  scheme: "device" | "password",
): Promise<ApiKeySecret> {
  const iv = randomBytes(IV_LENGTH);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  return {
    v: 1,
    scheme,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(ct),
  };
}

export async function decryptApiKey(secret: ApiKeySecret, key: CryptoKey): Promise<string> {
  const iv = base64ToBytes(secret.iv);
  const ct = base64ToBytes(secret.ct);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(plain);
}

type CanaryRecord = {
  v: 1;
  iv: string;
  ct: string;
  salt: string;
  iterations: number;
};

export async function writeCanary(
  passwordKey: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<void> {
  const iv = randomBytes(IV_LENGTH);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      passwordKey,
      new TextEncoder().encode(CANARY_PLAINTEXT),
    ),
  );
  const record: CanaryRecord = {
    v: 1,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(ct),
    salt: bytesToBase64(salt),
    iterations,
  };
  await idbPut(STORE_META, record, CANARY_KEY_ID);
}

export async function verifyCanary(passwordKey: CryptoKey): Promise<boolean> {
  const record = await idbGet<CanaryRecord>(STORE_META, CANARY_KEY_ID);
  if (!record) return false;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(record.iv) },
      passwordKey,
      base64ToBytes(record.ct),
    );
    return new TextDecoder().decode(plain) === CANARY_PLAINTEXT;
  } catch {
    return false;
  }
}

export async function clearCanary(): Promise<void> {
  await idbDelete(STORE_META, CANARY_KEY_ID);
}

export async function readCanaryMeta(): Promise<{
  salt: Uint8Array<ArrayBuffer>;
  iterations: number;
} | null> {
  const record = await idbGet<CanaryRecord>(STORE_META, CANARY_KEY_ID);
  if (!record) return null;
  return {
    salt: base64ToBytes(record.salt),
    iterations: record.iterations,
  };
}

export async function hasCanary(): Promise<boolean> {
  const record = await idbGet<CanaryRecord>(STORE_META, CANARY_KEY_ID);
  return record !== undefined && record !== null;
}
