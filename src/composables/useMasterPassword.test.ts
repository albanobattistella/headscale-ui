import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import { __resetForTest, idbGet, STORE_PROFILES } from "@/lib/idb";
import {
  type ConnectionProfile,
  hydrate,
  profileStorage,
  profileStorageTestingHandle,
} from "@/lib/profile-storage";
import { masterPasswordTestingHandle, useMasterPassword } from "./useMasterPassword";

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
  masterPasswordTestingHandle.reset();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: memoryStore(),
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memoryStore(),
  });
});

async function bootstrap() {
  const mp = useMasterPassword();
  await mp.initialize();
  await hydrate({
    encryptLegacy: (plain) => mp.encryptWithDeviceKey(plain),
  });
  return mp;
}

function newProfile(plain: string, mp: ReturnType<typeof useMasterPassword>) {
  return mp.encryptApiKey(plain).then((apiKey) => {
    const profile: ConnectionProfile = {
      id: crypto.randomUUID(),
      name: "p",
      mode: "real",
      baseUrl: "https://hs",
      apiKey,
      updatedAt: new Date().toISOString(),
      scope: "persistent",
    };
    profileStorage.saveProfile(profile, "persistent");
    return profile;
  });
}

describe("useMasterPassword", () => {
  test("initialize: fresh install → device scheme, no password, ready", async () => {
    const mp = await bootstrap();
    expect(mp.isReady.value).toBe(true);
    expect(mp.isPasswordEnabled.value).toBe(false);
    expect(mp.isUnlocked.value).toBe(false);
    expect(mp.needsUnlock.value).toBe(false);
  });

  test("encrypt + decrypt via device key in fresh state", async () => {
    const mp = await bootstrap();
    const secret = await mp.encryptApiKey("hs_abc");
    expect(secret.scheme).toBe("device");
    expect(await mp.decryptApiKey(secret)).toBe("hs_abc");
  });

  test("enable password: rotates all persistent profiles, unlocks active key", async () => {
    const mp = await bootstrap();
    const profile = await newProfile("hs_token", mp);
    // wait for fire-and-forget put to settle
    await new Promise((r) => setTimeout(r, 20));

    await mp.enablePassword("correct horse");
    expect(mp.isPasswordEnabled.value).toBe(true);
    expect(mp.isUnlocked.value).toBe(true);

    const stored = (await idbGet(STORE_PROFILES, profile.id)) as ConnectionProfile;
    expect(stored.apiKey.scheme).toBe("password");
    expect(await mp.decryptApiKey(stored.apiKey)).toBe("hs_token");
  });

  test("lock + unlock with correct passphrase recovers active key", async () => {
    const mp = await bootstrap();
    const profile = await newProfile("hs_locked", mp);
    await new Promise((r) => setTimeout(r, 20));

    await mp.enablePassword("p");
    mp.lock();
    expect(mp.isUnlocked.value).toBe(false);
    expect(mp.needsUnlock.value).toBe(true);

    expect(await mp.unlock("p")).toBe(true);
    expect(mp.isUnlocked.value).toBe(true);

    const stored = (await idbGet(STORE_PROFILES, profile.id)) as ConnectionProfile;
    expect(await mp.decryptApiKey(stored.apiKey)).toBe("hs_locked");
  });

  test("unlock with wrong passphrase fails and leaves state locked", async () => {
    const mp = await bootstrap();
    await newProfile("k", mp);
    await new Promise((r) => setTimeout(r, 20));

    await mp.enablePassword("right");
    mp.lock();
    expect(await mp.unlock("wrong")).toBe(false);
    expect(mp.isUnlocked.value).toBe(false);
  });

  test("change password: old fails, new works", async () => {
    const mp = await bootstrap();
    const profile = await newProfile("hs_x", mp);
    await new Promise((r) => setTimeout(r, 20));

    await mp.enablePassword("old");
    await mp.changePassword("old", "new");
    mp.lock();

    expect(await mp.unlock("old")).toBe(false);
    expect(await mp.unlock("new")).toBe(true);

    const stored = (await idbGet(STORE_PROFILES, profile.id)) as ConnectionProfile;
    expect(await mp.decryptApiKey(stored.apiKey)).toBe("hs_x");
  });

  test("disable password: rotates back to device, canary cleared", async () => {
    const mp = await bootstrap();
    const profile = await newProfile("hs_dd", mp);
    await new Promise((r) => setTimeout(r, 20));

    await mp.enablePassword("p");
    await mp.disablePassword("p");

    expect(mp.isPasswordEnabled.value).toBe(false);
    expect(mp.isUnlocked.value).toBe(false);

    const stored = (await idbGet(STORE_PROFILES, profile.id)) as ConnectionProfile;
    expect(stored.apiKey.scheme).toBe("device");
    expect(await mp.decryptApiKey(stored.apiKey)).toBe("hs_dd");
  });

  test("disable with wrong passphrase throws and leaves password enabled", async () => {
    const mp = await bootstrap();
    await newProfile("k", mp);
    await new Promise((r) => setTimeout(r, 20));

    await mp.enablePassword("right");
    await expect(mp.disablePassword("wrong")).rejects.toThrow(/incorrect/i);
    expect(mp.isPasswordEnabled.value).toBe(true);
  });

  test("after rehydrate with canary present, needsUnlock is true", async () => {
    const mp = await bootstrap();
    await mp.enablePassword("p");

    // simulate page reload
    profileStorageTestingHandle.reset();
    __resetForTest();
    masterPasswordTestingHandle.reset();

    const mp2 = await bootstrap();
    expect(mp2.isPasswordEnabled.value).toBe(true);
    expect(mp2.isUnlocked.value).toBe(false);
    expect(mp2.needsUnlock.value).toBe(true);

    expect(await mp2.unlock("p")).toBe(true);
  });
});
