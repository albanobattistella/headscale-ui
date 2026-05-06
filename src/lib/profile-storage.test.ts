import { describe, expect, test } from "bun:test";
import {
  activeProfileStorageKey,
  type ConnectionProfile,
  createProfileStorageProvider,
  profilesStorageKey,
  type StorageDependency,
} from "./profile-storage";

function memoryStorage(): StorageDependency & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function profile(id: string, name = id): ConnectionProfile {
  return {
    id,
    name,
    mode: "mock",
    baseUrl: `http://${name}.example.test`,
    apiKey: `${name}-key`,
    updatedAt: "2026-05-05T00:00:00.000Z",
  };
}

describe("profile storage provider", () => {
  test("stores remembered profiles in persistent storage", () => {
    const persistent = memoryStorage();
    const session = memoryStorage();
    const provider = createProfileStorageProvider({ persistent, session });

    provider.saveProfile(profile("office"), "persistent");
    provider.setActiveProfile("office", "persistent");

    expect(persistent.getItem(profilesStorageKey)).toContain("office");
    expect(session.getItem(profilesStorageKey)).toBeNull();
    expect(persistent.getItem(activeProfileStorageKey)).toBe("office");
    expect(session.getItem(activeProfileStorageKey)).toBeNull();
  });

  test("stores non-remembered profiles in session storage", () => {
    const persistent = memoryStorage();
    const session = memoryStorage();
    const provider = createProfileStorageProvider({ persistent, session });

    provider.saveProfile(profile("lab"), "persistent");
    provider.saveProfile(profile("lab", "temporary-lab"), "session");
    provider.setActiveProfile("lab", "session");

    expect(persistent.getItem(profilesStorageKey)).toBeNull();
    expect(session.getItem(profilesStorageKey)).toContain("temporary-lab");
    expect(provider.loadProfiles()).toHaveLength(1);
    expect(provider.getProfileScope("lab")).toBe("session");
    expect(session.getItem(activeProfileStorageKey)).toBe("lab");
    expect(persistent.getItem(activeProfileStorageKey)).toBeNull();
  });

  test("deletes a profile from both storage scopes", () => {
    const persistent = memoryStorage();
    const session = memoryStorage();
    const provider = createProfileStorageProvider({ persistent, session });

    provider.saveProfile(profile("office"), "persistent");
    provider.saveProfile(profile("lab"), "session");
    provider.setActiveProfile("lab", "session");
    provider.deleteProfile("lab");

    expect(provider.loadProfiles().map((item) => item.id)).toEqual(["office"]);
    expect(session.getItem(activeProfileStorageKey)).toBeNull();
  });
});
