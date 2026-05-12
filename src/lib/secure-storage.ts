/**
 * One-shot reset of every piece of local state owned by headscale-ui.
 * Invoked by:
 *   - SecuritySettings → "Clear all saved connections"
 *   - UnlockOverlay → "Forgot passphrase"
 *   - ErrorScreen → "Reset application data"
 */

import { idbClear, STORE_KEYS, STORE_META, STORE_PROFILES } from "./idb";

const SESSION_STORAGE_PREFIX = "headscale-ui-";
const LEGACY_LOCAL_STORAGE_KEYS = [
  "headscale-ui-profiles",
  "headscale-ui-active-profile",
  "headscale-ui-connection",
];

export async function clearAllSecureData(): Promise<void> {
  await Promise.all([idbClear(STORE_PROFILES), idbClear(STORE_KEYS), idbClear(STORE_META)]);
  if (typeof sessionStorage !== "undefined") {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(SESSION_STORAGE_PREFIX)) toRemove.push(k);
    }
    for (const k of toRemove) sessionStorage.removeItem(k);
  }
  if (typeof localStorage !== "undefined") {
    for (const k of LEGACY_LOCAL_STORAGE_KEYS) localStorage.removeItem(k);
  }
}
