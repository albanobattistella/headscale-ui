import { type ApiKeySecret, isEncryptedApiKey } from "./api-key-crypto";
import {
  idbDelete,
  idbGetAll,
  idbPut,
  openHeadscaleDb,
  STORE_META,
  STORE_PROFILES,
  withTransaction,
} from "./idb";

export type ProfileStorageScope = "persistent" | "session";

export type ConnectionProfile = {
  id: string;
  name: string;
  mode: "mock" | "real";
  baseUrl: string;
  apiKey: ApiKeySecret;
  updatedAt: string;
  scope: ProfileStorageScope;
  ownerTabId?: string;
  corrupted?: true;
};

export const legacyConnectionStorageKey = "headscale-ui-connection";
export const profilesStorageKey = "headscale-ui-profiles";
export const activeProfileStorageKey = "headscale-ui-active-profile";

const ACTIVE_PROFILE_META_KEY = "active-profile-id";
const SESSION_TAB_ID_KEY = "headscale-ui-tab-id";

type CacheState = {
  profiles: Map<string, ConnectionProfile>;
  activeProfileId: string | null;
  tabId: string;
  isPersistentAvailable: boolean;
};

const cache: CacheState = {
  profiles: new Map(),
  activeProfileId: null,
  tabId: "",
  isPersistentAvailable: false,
};

let hydrated = false;

function obtainTabId(): string {
  if (typeof sessionStorage === "undefined") return crypto.randomUUID();
  const existing = sessionStorage.getItem(SESSION_TAB_ID_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  sessionStorage.setItem(SESSION_TAB_ID_KEY, fresh);
  return fresh;
}

function ensureHydrated() {
  if (!hydrated) {
    throw new Error("profileStorage accessed before hydrate(); call hydrate() in main.ts first");
  }
}

export type HydrateOptions = {
  /**
   * Re-encrypt a legacy plaintext apiKey. Supplied by main.ts as a closure bound to the
   * current device key; keeps profile-storage free of crypto policy decisions.
   */
  encryptLegacy?: (plain: string) => Promise<ApiKeySecret>;
};

export async function hydrate(options: HydrateOptions = {}): Promise<void> {
  cache.tabId = obtainTabId();
  cache.profiles.clear();
  cache.activeProfileId = null;
  cache.isPersistentAvailable = false;

  try {
    await openHeadscaleDb();
    cache.isPersistentAvailable = true;
  } catch (err) {
    console.warn("[headscale-ui] IndexedDB unavailable; persistent profiles disabled", err);
    hydrated = true;
    return;
  }

  await migrateLegacyLocalStorage(options.encryptLegacy);

  const raw = await idbGetAll<unknown>(STORE_PROFILES);
  let migratedPlaintextCount = 0;
  const migratedIds: string[] = [];

  for (const r of raw) {
    const candidate = r as Partial<ConnectionProfile> & { apiKey?: unknown };
    if (!candidate.id || typeof candidate.id !== "string") continue;

    let apiKey: ApiKeySecret | undefined;
    let corrupted: true | undefined = candidate.corrupted === true ? true : undefined;

    if (typeof candidate.apiKey === "string") {
      if (!options.encryptLegacy) {
        console.warn(
          "[headscale-ui] plaintext apiKey in IDB but no encryptLegacy callback provided; marking profile corrupted",
        );
        corrupted = true;
        apiKey = { v: 1, scheme: "device", iv: "", ct: "" };
      } else {
        try {
          apiKey = await options.encryptLegacy(candidate.apiKey);
          migratedPlaintextCount++;
          migratedIds.push(candidate.id);
        } catch (err) {
          console.error("[headscale-ui] failed to encrypt legacy plaintext profile", err);
          corrupted = true;
          apiKey = { v: 1, scheme: "device", iv: "", ct: "" };
        }
      }
    } else if (isEncryptedApiKey(candidate.apiKey)) {
      apiKey = candidate.apiKey;
    } else {
      corrupted = true;
      apiKey = { v: 1, scheme: "device", iv: "", ct: "" };
    }

    const scope: ProfileStorageScope = candidate.scope === "session" ? "session" : "persistent";
    const ownerTabId = scope === "session" ? candidate.ownerTabId : undefined;

    if (scope === "session" && ownerTabId !== cache.tabId) {
      try {
        await idbDelete(STORE_PROFILES, candidate.id);
      } catch (err) {
        console.error("[headscale-ui] failed to discard stale session profile", err);
      }
      continue;
    }

    const profile: ConnectionProfile = {
      id: candidate.id,
      name: candidate.name ?? candidate.baseUrl ?? "Profile",
      mode: candidate.mode === "real" ? "real" : candidate.mode === "mock" ? "mock" : "real",
      baseUrl: candidate.baseUrl ?? "",
      apiKey,
      updatedAt: candidate.updatedAt ?? new Date().toISOString(),
      scope,
      ownerTabId,
      ...(corrupted ? { corrupted: true as const } : {}),
    };
    cache.profiles.set(profile.id, profile);
  }

  if (migratedIds.length > 0) {
    console.info(
      `[headscale-ui] migrated ${migratedPlaintextCount} plaintext profile(s) in IndexedDB`,
    );
    for (const id of migratedIds) {
      const p = cache.profiles.get(id);
      if (!p) continue;
      try {
        await idbPut(STORE_PROFILES, p);
      } catch (err) {
        console.error("[headscale-ui] failed to write migrated profile", err);
      }
    }
  }

  cache.activeProfileId = await readActiveProfileFromMeta();
  hydrated = true;
}

async function readActiveProfileFromMeta(): Promise<string | null> {
  try {
    const db = await openHeadscaleDb();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_META, "readonly");
      const req = tx.objectStore(STORE_META).get(ACTIVE_PROFILE_META_KEY);
      req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function migrateLegacyLocalStorage(
  encryptLegacy: HydrateOptions["encryptLegacy"],
): Promise<void> {
  if (typeof localStorage === "undefined") return;

  const profilesRaw = localStorage.getItem(profilesStorageKey);
  const activeRaw =
    localStorage.getItem(activeProfileStorageKey) ??
    (typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(activeProfileStorageKey)
      : null);

  if (!profilesRaw && !activeRaw) return;

  let migratedCount = 0;
  if (profilesRaw) {
    try {
      const parsed = JSON.parse(profilesRaw);
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          const partial = p as Partial<ConnectionProfile> & { apiKey?: unknown };
          if (!partial.id || typeof partial.apiKey !== "string") continue;
          if (!encryptLegacy) continue;
          try {
            const apiKey = await encryptLegacy(partial.apiKey);
            const profile: ConnectionProfile = {
              id: partial.id,
              name: partial.name ?? partial.baseUrl ?? "Profile",
              mode: partial.mode === "mock" ? "mock" : "real",
              baseUrl: partial.baseUrl ?? "",
              apiKey,
              updatedAt: partial.updatedAt ?? new Date().toISOString(),
              scope: "persistent",
            };
            await idbPut(STORE_PROFILES, profile);
            migratedCount++;
          } catch (err) {
            console.error("[headscale-ui] failed to migrate legacy profile", err);
          }
        }
      }
    } catch (err) {
      console.warn("[headscale-ui] failed to parse legacy profiles", err);
    }
  }

  if (activeRaw) {
    try {
      await idbPut(STORE_META, activeRaw, ACTIVE_PROFILE_META_KEY);
    } catch (err) {
      console.error("[headscale-ui] failed to migrate active profile id", err);
    }
  }

  localStorage.removeItem(profilesStorageKey);
  localStorage.removeItem(activeProfileStorageKey);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(profilesStorageKey);
    sessionStorage.removeItem(activeProfileStorageKey);
  }

  if (migratedCount > 0) {
    console.info(`[headscale-ui] migrated ${migratedCount} profile(s) from localStorage`);
  }
}

export type ProfileStorageProvider = {
  loadProfiles(): ConnectionProfile[];
  saveProfile(profile: ConnectionProfile, scope: ProfileStorageScope): void;
  deleteProfile(profileId: string): void;
  getProfileScope(profileId: string): ProfileStorageScope | null;
  setActiveProfile(profileId: string, scope: ProfileStorageScope): void;
  clearActiveProfile(): void;
  readActiveProfile(): string | null;
  hasAnyProfile(): boolean;
  hasProfile(profileId: string): boolean;
  consumeLegacyConnection(): string | null;
  markCorrupted(profileId: string): void;
  isPersistentAvailable(): boolean;
  currentTabId(): string;
};

export const profileStorage: ProfileStorageProvider = {
  loadProfiles() {
    ensureHydrated();
    return Array.from(cache.profiles.values());
  },
  saveProfile(profile, scope) {
    ensureHydrated();
    const stored: ConnectionProfile = {
      ...profile,
      scope,
      ownerTabId: scope === "session" ? cache.tabId : undefined,
    };
    cache.profiles.set(stored.id, stored);
    void idbPut(STORE_PROFILES, stored).catch((err) => {
      console.error("[headscale-ui] saveProfile idbPut failed", err);
    });
  },
  deleteProfile(profileId) {
    ensureHydrated();
    cache.profiles.delete(profileId);
    if (cache.activeProfileId === profileId) {
      cache.activeProfileId = null;
      void idbDelete(STORE_META, ACTIVE_PROFILE_META_KEY).catch((err) => {
        console.error("[headscale-ui] clearActiveProfile idbDelete failed", err);
      });
    }
    void idbDelete(STORE_PROFILES, profileId).catch((err) => {
      console.error("[headscale-ui] deleteProfile idbDelete failed", err);
    });
  },
  getProfileScope(profileId) {
    ensureHydrated();
    return cache.profiles.get(profileId)?.scope ?? null;
  },
  setActiveProfile(profileId, _scope) {
    ensureHydrated();
    cache.activeProfileId = profileId;
    void idbPut(STORE_META, profileId, ACTIVE_PROFILE_META_KEY).catch((err) => {
      console.error("[headscale-ui] setActiveProfile idbPut failed", err);
    });
  },
  clearActiveProfile() {
    ensureHydrated();
    cache.activeProfileId = null;
    void idbDelete(STORE_META, ACTIVE_PROFILE_META_KEY).catch((err) => {
      console.error("[headscale-ui] clearActiveProfile idbDelete failed", err);
    });
  },
  readActiveProfile() {
    ensureHydrated();
    return cache.activeProfileId;
  },
  hasAnyProfile() {
    ensureHydrated();
    return cache.profiles.size > 0;
  },
  hasProfile(profileId) {
    ensureHydrated();
    return cache.profiles.has(profileId);
  },
  consumeLegacyConnection() {
    if (typeof localStorage === "undefined") return null;
    const v = localStorage.getItem(legacyConnectionStorageKey);
    localStorage.removeItem(legacyConnectionStorageKey);
    return v;
  },
  markCorrupted(profileId) {
    ensureHydrated();
    const profile = cache.profiles.get(profileId);
    if (!profile || profile.corrupted) return;
    const updated: ConnectionProfile = { ...profile, corrupted: true };
    cache.profiles.set(profileId, updated);
    void idbPut(STORE_PROFILES, updated).catch((err) => {
      console.error("[headscale-ui] markCorrupted idbPut failed", err);
    });
  },
  isPersistentAvailable() {
    return cache.isPersistentAvailable;
  },
  currentTabId() {
    return cache.tabId;
  },
};

export type ReencryptAllOptions = {
  /** Translate the current secret into the next one. Run for every persistent profile. */
  transform: (current: ApiKeySecret) => Promise<ApiKeySecret>;
  /** Synchronous hook inside the same IDB write transaction (write/clear canary, etc.). */
  withinTransaction?: (tx: IDBTransaction) => void;
};

/**
 * Two-phase atomic re-encryption:
 *   1) memory phase — decrypt+encrypt every persistent profile via `transform`. Any throw
 *      aborts with cache untouched.
 *   2) persistence phase — commit all writes (and the optional canary update) inside a single
 *      readwrite transaction. IDB rolls back on partial failure.
 */
export async function reencryptAll(options: ReencryptAllOptions): Promise<void> {
  ensureHydrated();
  const persistent = Array.from(cache.profiles.values()).filter(
    (p) => p.scope === "persistent" && !p.corrupted,
  );

  const rewritten: ConnectionProfile[] = [];
  for (const p of persistent) {
    const nextSecret = await options.transform(p.apiKey);
    rewritten.push({ ...p, apiKey: nextSecret });
  }

  const stores = options.withinTransaction ? [STORE_PROFILES, STORE_META] : [STORE_PROFILES];
  await withTransaction(stores, "readwrite", (tx) => {
    const profilesStore = tx.objectStore(STORE_PROFILES);
    for (const p of rewritten) profilesStore.put(p);
    options.withinTransaction?.(tx);
  });

  for (const p of rewritten) cache.profiles.set(p.id, p);
}

export const profileStorageTestingHandle = {
  reset() {
    cache.profiles.clear();
    cache.activeProfileId = null;
    cache.tabId = "";
    cache.isPersistentAvailable = false;
    hydrated = false;
  },
};
