/**
 * Sync-shaped, IndexedDB-backed key-value store for UI preferences (theme,
 * locale, …). Modelled after profile-storage: callers must `await
 * hydrateSettings()` once at bootstrap before any synchronous read.
 *
 * All settings are persisted as a single record under STORE_META keyed by
 * SETTINGS_META_KEY, so an atomic IDB put updates the whole snapshot in one
 * shot — readers cache the record in memory.
 */

import { idbGet, idbPut, openHeadscaleDb, STORE_META } from "./idb";

const SETTINGS_META_KEY = "ui-settings";

type SettingsRecord = Record<string, string>;

type CacheState = {
  values: SettingsRecord;
  hydrated: boolean;
};

const cache: CacheState = {
  values: {},
  hydrated: false,
};

function ensureHydrated() {
  if (!cache.hydrated) {
    throw new Error(
      "settings-storage accessed before hydrateSettings(); call hydrateSettings() in main.ts first",
    );
  }
}

export async function hydrateSettings(): Promise<void> {
  cache.values = {};
  try {
    await openHeadscaleDb();
  } catch (err) {
    console.warn("[headscale-ui] IndexedDB unavailable; settings kept in-memory only", err);
    cache.hydrated = true;
    return;
  }
  try {
    const raw = await idbGet<SettingsRecord>(STORE_META, SETTINGS_META_KEY);
    if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === "string") cache.values[k] = v;
      }
    }
  } catch (err) {
    console.warn("[headscale-ui] settings hydrate read failed", err);
  }
  cache.hydrated = true;
}

export function readSetting(key: string): string | null {
  ensureHydrated();
  return cache.values[key] ?? null;
}

export function writeSetting(key: string, value: string): void {
  ensureHydrated();
  cache.values[key] = value;
  const snapshot = { ...cache.values };
  void idbPut(STORE_META, snapshot, SETTINGS_META_KEY).catch((err) => {
    console.error(`[headscale-ui] writeSetting ${key} failed`, err);
  });
}

/** Internal: invoked by tests only. */
export const settingsStorageTestingHandle = {
  reset() {
    cache.values = {};
    cache.hydrated = false;
  },
};
