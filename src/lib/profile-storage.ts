import type { ConnectionSettings } from "@/api/http";

export const legacyConnectionStorageKey = "headscale-ui-connection";
export const profilesStorageKey = "headscale-ui-profiles";
export const activeProfileStorageKey = "headscale-ui-active-profile";

export type ProfileStorageScope = "persistent" | "session";

export type ConnectionProfile = ConnectionSettings & {
  id: string;
  name: string;
  updatedAt: string;
};

export type StorageDependency = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ProfileStorageDependencies = {
  persistent?: StorageDependency;
  session?: StorageDependency;
};

export type ProfileStorageProvider = {
  loadProfiles(): ConnectionProfile[];
  saveProfile(profile: ConnectionProfile, scope: ProfileStorageScope): void;
  deleteProfile(profileId: string): void;
  getProfileScope(profileId: string): ProfileStorageScope | null;
  setActiveProfile(profileId: string, scope: ProfileStorageScope): void;
  clearActiveProfile(): void;
  /** Currently-active profile id (session storage wins over local). */
  readActiveProfile(): string | null;
  /** True iff at least one profile is saved in either scope. */
  hasAnyProfile(): boolean;
  /** True iff a profile with this exact id exists (no substring matching). */
  hasProfile(profileId: string): boolean;
  consumeLegacyConnection(): string | null;
};

function readProfiles(storage?: StorageDependency) {
  if (!storage) {
    return [];
  }

  const value = storage.getItem(profilesStorageKey);
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ConnectionProfile[]) : [];
  } catch {
    storage.removeItem(profilesStorageKey);
    return [];
  }
}

function writeProfiles(storage: StorageDependency | undefined, profiles: ConnectionProfile[]) {
  if (!storage) {
    return;
  }

  if (profiles.length === 0) {
    storage.removeItem(profilesStorageKey);
    return;
  }

  storage.setItem(profilesStorageKey, JSON.stringify(profiles));
}

function withoutProfile(profiles: ConnectionProfile[], profileId: string) {
  return profiles.filter((profile) => profile.id !== profileId);
}

function upsertProfile(profiles: ConnectionProfile[], profile: ConnectionProfile) {
  return [...withoutProfile(profiles, profile.id), profile];
}

export function createProfileStorageProvider(
  dependencies: ProfileStorageDependencies,
): ProfileStorageProvider {
  const storageForScope = (scope: ProfileStorageScope) =>
    scope === "persistent" ? dependencies.persistent : dependencies.session;

  const oppositeStorageForScope = (scope: ProfileStorageScope) =>
    scope === "persistent" ? dependencies.session : dependencies.persistent;

  return {
    loadProfiles() {
      const profiles = new Map<string, ConnectionProfile>();
      for (const profile of readProfiles(dependencies.persistent)) {
        profiles.set(profile.id, profile);
      }
      for (const profile of readProfiles(dependencies.session)) {
        profiles.set(profile.id, profile);
      }
      return Array.from(profiles.values());
    },
    saveProfile(profile, scope) {
      const target = storageForScope(scope);
      const other = oppositeStorageForScope(scope);
      writeProfiles(target, upsertProfile(readProfiles(target), profile));
      writeProfiles(other, withoutProfile(readProfiles(other), profile.id));
    },
    deleteProfile(profileId) {
      for (const storage of [dependencies.persistent, dependencies.session]) {
        writeProfiles(storage, withoutProfile(readProfiles(storage), profileId));
        if (storage?.getItem(activeProfileStorageKey) === profileId) {
          storage.removeItem(activeProfileStorageKey);
        }
      }
    },
    getProfileScope(profileId) {
      if (readProfiles(dependencies.session).some((profile) => profile.id === profileId)) {
        return "session";
      }
      if (readProfiles(dependencies.persistent).some((profile) => profile.id === profileId)) {
        return "persistent";
      }
      return null;
    },
    setActiveProfile(profileId, scope) {
      storageForScope(scope)?.setItem(activeProfileStorageKey, profileId);
      oppositeStorageForScope(scope)?.removeItem(activeProfileStorageKey);
    },
    clearActiveProfile() {
      dependencies.persistent?.removeItem(activeProfileStorageKey);
      dependencies.session?.removeItem(activeProfileStorageKey);
    },
    readActiveProfile() {
      return (
        dependencies.session?.getItem(activeProfileStorageKey) ??
        dependencies.persistent?.getItem(activeProfileStorageKey) ??
        null
      );
    },
    hasAnyProfile() {
      return (
        readProfiles(dependencies.session).length > 0 ||
        readProfiles(dependencies.persistent).length > 0
      );
    },
    hasProfile(profileId) {
      return (
        readProfiles(dependencies.session).some((p) => p.id === profileId) ||
        readProfiles(dependencies.persistent).some((p) => p.id === profileId)
      );
    },
    consumeLegacyConnection() {
      const value = dependencies.persistent?.getItem(legacyConnectionStorageKey) ?? null;
      dependencies.persistent?.removeItem(legacyConnectionStorageKey);
      return value;
    },
  };
}

/**
 * Singleton browser-backed profile storage. Use this everywhere in app code.
 * Tests construct their own provider via `createProfileStorageProvider`.
 */
export const profileStorage: ProfileStorageProvider = createProfileStorageProvider({
  persistent: typeof localStorage === "undefined" ? undefined : localStorage,
  session: typeof sessionStorage === "undefined" ? undefined : sessionStorage,
});
