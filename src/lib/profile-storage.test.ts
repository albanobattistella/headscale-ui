import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import {
  type ApiKeySecret,
  decryptApiKey,
  deriveKeyFromPassword,
  encryptApiKey,
  generateCanarySalt,
  getOrCreateDeviceKey,
} from "./api-key-crypto";
import { __resetForTest, idbGet, idbGetAll, idbPut, STORE_META, STORE_PROFILES } from "./idb";
import {
  type ConnectionProfile,
  hydrate,
  profileStorage,
  profileStorageTestingHandle,
  reencryptAll,
} from "./profile-storage";

const memoryStore = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key) {
      data.delete(key);
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
};

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  __resetForTest();
  profileStorageTestingHandle.reset();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: memoryStore(),
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memoryStore(),
  });
});

async function makeSecret(plain: string): Promise<ApiKeySecret> {
  const key = await getOrCreateDeviceKey();
  return encryptApiKey(plain, key, "device");
}

function buildProfile(overrides: Partial<ConnectionProfile> & { apiKey: ApiKeySecret }) {
  const base: ConnectionProfile = {
    id: crypto.randomUUID(),
    name: "Test",
    mode: "real",
    baseUrl: "https://hs.example",
    apiKey: overrides.apiKey,
    updatedAt: new Date().toISOString(),
    scope: "persistent",
  };
  return { ...base, ...overrides };
}

describe("hydrate", () => {
  test("calling sync API before hydrate throws", () => {
    expect(() => profileStorage.loadProfiles()).toThrow();
  });

  test("empty IDB → empty cache, persistent flag true", async () => {
    await hydrate();
    expect(profileStorage.loadProfiles()).toEqual([]);
    expect(profileStorage.isPersistentAvailable()).toBe(true);
    expect(profileStorage.hasAnyProfile()).toBe(false);
  });

  test("session profile from another tab is discarded", async () => {
    const stale = buildProfile({
      apiKey: await makeSecret("k"),
      scope: "session",
      ownerTabId: "other-tab",
    });
    await idbPut(STORE_PROFILES, stale);
    __resetForTest();
    profileStorageTestingHandle.reset();

    await hydrate();
    expect(profileStorage.loadProfiles()).toEqual([]);
    expect(await idbGetAll(STORE_PROFILES)).toHaveLength(0);
  });

  test("session profile owned by current tab survives", async () => {
    await hydrate();
    const tabId = profileStorage.currentTabId();
    profileStorageTestingHandle.reset();
    __resetForTest();

    const mine = buildProfile({
      apiKey: await makeSecret("k"),
      scope: "session",
      ownerTabId: tabId,
    });
    await idbPut(STORE_PROFILES, mine);

    sessionStorage.setItem("headscale-ui-tab-id", tabId);
    await hydrate();
    expect(profileStorage.loadProfiles().map((p) => p.id)).toEqual([mine.id]);
  });
});

describe("save/load round-trip", () => {
  test("saveProfile + loadProfiles via cache", async () => {
    await hydrate();
    const secret = await makeSecret("hs_xyz");
    const profile = buildProfile({ apiKey: secret });
    profileStorage.saveProfile(profile, "persistent");

    expect(profileStorage.loadProfiles()).toHaveLength(1);
    expect(profileStorage.hasProfile(profile.id)).toBe(true);
    expect(profileStorage.getProfileScope(profile.id)).toBe("persistent");
  });

  test("saveProfile with session scope tags with current tab id", async () => {
    await hydrate();
    const tabId = profileStorage.currentTabId();
    const secret = await makeSecret("hs_session");
    const profile = buildProfile({ apiKey: secret, scope: "persistent" });
    profileStorage.saveProfile(profile, "session");

    const loaded = profileStorage.loadProfiles()[0];
    expect(loaded.scope).toBe("session");
    expect(loaded.ownerTabId).toBe(tabId);
  });

  test("deleteProfile drops cache + IDB", async () => {
    await hydrate();
    const profile = buildProfile({ apiKey: await makeSecret("k") });
    profileStorage.saveProfile(profile, "persistent");
    profileStorage.deleteProfile(profile.id);
    expect(profileStorage.hasProfile(profile.id)).toBe(false);
    await new Promise((r) => setTimeout(r, 10));
    expect(await idbGet(STORE_PROFILES, profile.id)).toBeUndefined();
  });

  test("set/read/clear active profile", async () => {
    await hydrate();
    const profile = buildProfile({ apiKey: await makeSecret("k") });
    profileStorage.saveProfile(profile, "persistent");

    profileStorage.setActiveProfile(profile.id, "persistent");
    expect(profileStorage.readActiveProfile()).toBe(profile.id);

    profileStorage.clearActiveProfile();
    expect(profileStorage.readActiveProfile()).toBeNull();
  });
});

describe("markCorrupted", () => {
  test("persisted to IDB and visible after re-hydrate", async () => {
    await hydrate();
    const profile = buildProfile({ apiKey: await makeSecret("k") });
    profileStorage.saveProfile(profile, "persistent");
    profileStorage.markCorrupted(profile.id);

    await new Promise((r) => setTimeout(r, 20));
    profileStorageTestingHandle.reset();
    __resetForTest();
    await hydrate();

    const reloaded = profileStorage.loadProfiles().find((p) => p.id === profile.id);
    expect(reloaded?.corrupted).toBe(true);
  });
});

describe("IDB plaintext migration", () => {
  test("plaintext apiKey written directly to IDB gets re-encrypted in place", async () => {
    const id = crypto.randomUUID();
    await idbPut(STORE_PROFILES, {
      id,
      name: "Mid",
      mode: "real",
      baseUrl: "https://hs.mid",
      apiKey: "hs_mid_plain",
      updatedAt: new Date().toISOString(),
      scope: "persistent",
    });

    const deviceKey = await getOrCreateDeviceKey();
    await hydrate({
      encryptLegacy: (plain) => encryptApiKey(plain, deviceKey, "device"),
    });

    const loaded = profileStorage.loadProfiles();
    expect(loaded[0].id).toBe(id);
    const plain = await decryptApiKey(loaded[0].apiKey, deviceKey);
    expect(plain).toBe("hs_mid_plain");

    const raw = (await idbGet(STORE_PROFILES, id)) as ConnectionProfile;
    expect(typeof raw.apiKey).toBe("object");
    expect((raw.apiKey as ApiKeySecret).scheme).toBe("device");
  });
});

describe("reencryptAll", () => {
  test("happy path: every persistent profile transformed and persisted in one transaction", async () => {
    await hydrate();
    const deviceKey = await getOrCreateDeviceKey();
    const a = buildProfile({ apiKey: await encryptApiKey("token-a", deviceKey, "device") });
    const b = buildProfile({ apiKey: await encryptApiKey("token-b", deviceKey, "device") });
    profileStorage.saveProfile(a, "persistent");
    profileStorage.saveProfile(b, "persistent");
    await new Promise((r) => setTimeout(r, 20));

    const salt = generateCanarySalt();
    const passwordKey = await deriveKeyFromPassword("p", salt, 10_000);

    await reencryptAll({
      transform: async (current) => {
        const plain = await decryptApiKey(current, deviceKey);
        return encryptApiKey(plain, passwordKey, "password");
      },
      withinTransaction: (tx) => {
        tx.objectStore(STORE_META).put({ marker: 1 }, "password-canary");
      },
    });

    for (const p of profileStorage.loadProfiles()) {
      expect(p.apiKey.scheme).toBe("password");
      const plain = await decryptApiKey(p.apiKey, passwordKey);
      expect(plain).toMatch(/^token-[ab]$/);
    }

    const canary = (await idbGet(STORE_META, "password-canary")) as { marker: number };
    expect(canary?.marker).toBe(1);
  });

  test("memory phase failure leaves cache and IDB unchanged", async () => {
    await hydrate();
    const deviceKey = await getOrCreateDeviceKey();
    const a = buildProfile({ apiKey: await encryptApiKey("token-a", deviceKey, "device") });
    profileStorage.saveProfile(a, "persistent");
    await new Promise((r) => setTimeout(r, 20));

    const before = (await idbGet(STORE_PROFILES, a.id)) as ConnectionProfile;

    await expect(
      reencryptAll({
        transform: async () => {
          throw new Error("simulated failure mid-rotation");
        },
      }),
    ).rejects.toThrow("simulated failure");

    const after = (await idbGet(STORE_PROFILES, a.id)) as ConnectionProfile;
    expect(after.apiKey).toEqual(before.apiKey);
    const cached = profileStorage.loadProfiles()[0];
    expect(cached.apiKey).toEqual(before.apiKey);
  });

  test("corrupted profiles are skipped", async () => {
    await hydrate();
    const deviceKey = await getOrCreateDeviceKey();
    const good = buildProfile({ apiKey: await encryptApiKey("g", deviceKey, "device") });
    const bad = buildProfile({ apiKey: await encryptApiKey("b", deviceKey, "device") });
    profileStorage.saveProfile(good, "persistent");
    profileStorage.saveProfile(bad, "persistent");
    profileStorage.markCorrupted(bad.id);
    await new Promise((r) => setTimeout(r, 20));

    let calls = 0;
    await reencryptAll({
      transform: async (s) => {
        calls++;
        return s;
      },
    });

    expect(calls).toBe(1);
  });
});
