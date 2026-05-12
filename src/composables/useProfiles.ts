import { type ComputedRef, computed, type Ref, reactive, ref } from "vue";
import type { ConnectionSettings } from "@/api/http";
import type { HeadscaleSnapshot } from "@/api/types";
import { useHeadscaleI18n } from "@/i18n";
import {
  type ConnectionProfile,
  type ProfileStorageScope,
  profileStorage,
} from "@/lib/profile-storage";
import { useActionFeedback } from "./useActionFeedback";
import { useHeadscaleClient } from "./useHeadscaleClient";
import { fetchSnapshot } from "./useSnapshot";

export const newProfileId = "__new__";
export const localMockBaseUrl = "http://127.0.0.1:8080";
const profileLoginMinimumMs = 300;

type ConnectionForm = ConnectionSettings & {
  profileId: string;
  profileName: string;
  remember: boolean;
};

type AuthenticatedHook = (snapshot: HeadscaleSnapshot) => void;
type LogoutHook = () => void;

interface UseProfilesReturn {
  profiles: Ref<ConnectionProfile[]>;
  connectionForm: ConnectionForm;
  isConnecting: Ref<boolean>;
  isRestoringSession: Ref<boolean>;
  authenticatingProfileId: Ref<string | null>;
  selectedProfile: ComputedRef<ConnectionProfile | undefined>;
  currentProfileLabel: ComputedRef<string>;
  connectionDialogOpen: Ref<boolean>;
  connectionCloseConfirmOpen: Ref<boolean>;
  profileValidationDialogOpen: Ref<boolean>;
  profileValidationError: Ref<string>;
  pendingDeleteProfile: Ref<ConnectionProfile | null>;
  loadProfile(profileId: string): void;
  openConnectionDialog(profileId: string): void;
  closeConnectionDialog(): void;
  addProfile(): Promise<void>;
  persistConnection(): string;
  editProfile(profile: ConnectionProfile): void;
  deleteProfile(profile: ConnectionProfile): void;
  confirmDeleteProfile(): void;
  enterProfile(profile: ConnectionProfile): Promise<boolean>;
  logout(): void;
  setOnAuthenticated(hook: AuthenticatedHook | null): void;
  setOnLogout(hook: LogoutHook | null): void;
}

let instance: UseProfilesReturn | null = null;

/** Internal: invoked by `__testing.ts` only. */
export const profilesTestingHandle = {
  reset() {
    instance = null;
  },
};

function normalizedBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, "");
}

function resolveConnectionMode(mode: ConnectionSettings["mode"], baseUrl: string) {
  if (mode === "mock" && normalizedBaseUrl(baseUrl) !== localMockBaseUrl) {
    return "real";
  }
  return mode;
}

function createProfileId() {
  return crypto.randomUUID();
}

function defaultConnectionForm(): ConnectionForm {
  return {
    profileId: newProfileId,
    profileName: "Local mock",
    mode: "mock",
    baseUrl: localMockBaseUrl,
    apiKey: "mock-api-key",
    remember: true,
  };
}

function profileToForm(profile: ConnectionProfile): ConnectionForm {
  return {
    profileId: profile.id,
    profileName: profile.name,
    mode: profile.mode,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    remember: profileStorage.getProfileScope(profile.id) !== "session",
  };
}

function normalizeProfile(profile: Partial<ConnectionProfile>): ConnectionProfile | null {
  if (!profile.baseUrl || !profile.apiKey || (profile.mode !== "mock" && profile.mode !== "real")) {
    return null;
  }

  const baseUrl = profile.baseUrl.trim();

  return {
    id: profile.id || createProfileId(),
    name: profile.name || baseUrl,
    mode: resolveConnectionMode(profile.mode, baseUrl),
    baseUrl,
    apiKey: profile.apiKey,
    updatedAt: profile.updatedAt || new Date().toISOString(),
  };
}

function normalizeProfiles(profileRecords: Partial<ConnectionProfile>[]) {
  return profileRecords
    .map((profile) => normalizeProfile(profile))
    .filter((profile): profile is ConnectionProfile => profile !== null);
}

function loadConnectionProfiles(): ConnectionProfile[] {
  const savedProfiles = normalizeProfiles(profileStorage.loadProfiles());
  if (savedProfiles.length > 0) {
    return savedProfiles;
  }

  const legacyConnection = profileStorage.consumeLegacyConnection();
  if (!legacyConnection) {
    return [];
  }

  try {
    const migrated = normalizeProfile({
      ...(JSON.parse(legacyConnection) as Partial<ConnectionProfile>),
      name: "Default",
    });
    if (!migrated) {
      return [];
    }
    profileStorage.saveProfile(migrated, "persistent");
    profileStorage.setActiveProfile(migrated.id, "persistent");
    return [migrated];
  } catch {
    return [];
  }
}

export function useProfiles(): UseProfilesReturn {
  if (instance) return instance;

  const { settings, createClient, setSettings } = useHeadscaleClient();
  const { lastError } = useActionFeedback();
  const { t } = useHeadscaleI18n();

  const profiles = ref<ConnectionProfile[]>(loadConnectionProfiles());
  const connectionForm = reactive<ConnectionForm>(defaultConnectionForm());

  Object.assign(settings, {
    mode: connectionForm.mode,
    baseUrl: connectionForm.baseUrl,
    apiKey: connectionForm.apiKey,
  });

  const isConnecting = ref(false);
  const isRestoringSession = ref(true);
  const authenticatingProfileId = ref<string | null>(null);
  const connectionDialogOpen = ref(false);
  const connectionCloseConfirmOpen = ref(false);
  const profileValidationDialogOpen = ref(false);
  const profileValidationError = ref("");
  const pendingDeleteProfile = ref<ConnectionProfile | null>(null);

  const selectedProfile = computed(() =>
    profiles.value.find((profile) => profile.id === connectionForm.profileId),
  );
  const currentProfileLabel = computed(() => connectionForm.profileName || t("profile"));

  let onAuthenticated: AuthenticatedHook | null = null;
  let onLogout: LogoutHook | null = null;

  function reloadProfiles() {
    profiles.value = normalizeProfiles(profileStorage.loadProfiles());
  }

  function profileScopeFromForm(): ProfileStorageScope {
    return connectionForm.remember ? "persistent" : "session";
  }

  function formConnectionSettings(): ConnectionSettings {
    const baseUrl = connectionForm.baseUrl.trim();
    return {
      mode: resolveConnectionMode(connectionForm.mode, baseUrl),
      baseUrl,
      apiKey: connectionForm.apiKey.trim(),
    };
  }

  function loadProfile(profileId: string) {
    connectionForm.profileId = profileId;

    if (profileId === newProfileId) {
      Object.assign(connectionForm, defaultConnectionForm());
      return;
    }

    const profile = profiles.value.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    Object.assign(connectionForm, profileToForm(profile));
  }

  function openConnectionDialog(profileId: string) {
    lastError.value = "";
    loadProfile(profileId);
    connectionDialogOpen.value = true;
  }

  function closeConnectionDialog() {
    connectionDialogOpen.value = false;
    connectionCloseConfirmOpen.value = false;
    lastError.value = "";
    profileValidationDialogOpen.value = false;
    profileValidationError.value = "";
  }

  function persistConnection(): string {
    const baseUrl = connectionForm.baseUrl.trim();
    const name = connectionForm.profileName.trim() || baseUrl;
    const existingProfile =
      connectionForm.profileId === newProfileId
        ? null
        : profiles.value.find((profile) => profile.id === connectionForm.profileId);
    const profile: ConnectionProfile = {
      id: existingProfile?.id ?? createProfileId(),
      name,
      mode: resolveConnectionMode(connectionForm.mode, baseUrl),
      baseUrl,
      apiKey: connectionForm.apiKey.trim(),
      updatedAt: new Date().toISOString(),
    };

    profiles.value = existingProfile
      ? profiles.value.map((item) => (item.id === existingProfile.id ? profile : item))
      : [...profiles.value, profile];
    connectionForm.profileId = profile.id;
    connectionForm.profileName = profile.name;
    connectionForm.mode = profile.mode;
    const scope = profileScopeFromForm();
    profileStorage.saveProfile(profile, scope);
    reloadProfiles();

    return profile.id;
  }

  async function addProfile() {
    const nextSettings = formConnectionSettings();
    isConnecting.value = true;
    lastError.value = "";
    connectionForm.mode = nextSettings.mode;

    try {
      await fetchSnapshot(createClient(nextSettings));
      persistConnection();
      closeConnectionDialog();
    } catch (error) {
      profileValidationError.value = error instanceof Error ? error.message : String(error);
      profileValidationDialogOpen.value = true;
    } finally {
      isConnecting.value = false;
    }
  }

  function editProfile(profile: ConnectionProfile) {
    openConnectionDialog(profile.id);
  }

  function deleteProfile(profile: ConnectionProfile) {
    pendingDeleteProfile.value = profile;
  }

  function confirmDeleteProfile() {
    const profileId = pendingDeleteProfile.value?.id;
    pendingDeleteProfile.value = null;
    if (!profileId || profileId === newProfileId) {
      return;
    }

    profiles.value = profiles.value.filter((profile) => profile.id !== profileId);
    profileStorage.deleteProfile(profileId);
    reloadProfiles();

    if (connectionForm.profileId === profileId) {
      loadProfile(profiles.value[0]?.id ?? newProfileId);
    }
  }

  async function authorizeProfile(profile: ConnectionProfile): Promise<boolean> {
    Object.assign(connectionForm, profileToForm(profile));
    const startedAt = performance.now();
    const nextSettings: ConnectionSettings = {
      mode: profile.mode,
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
    };

    isConnecting.value = true;
    authenticatingProfileId.value = profile.id;
    lastError.value = "";

    let succeeded = false;
    try {
      const nextSnapshot = await fetchSnapshot(createClient(nextSettings));
      setSettings(nextSettings);
      onAuthenticated?.(nextSnapshot);
      profileStorage.setActiveProfile(
        profile.id,
        profileStorage.getProfileScope(profile.id) ?? "session",
      );
      succeeded = true;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
      profileStorage.clearActiveProfile();
    } finally {
      const remainingMs = profileLoginMinimumMs - (performance.now() - startedAt);
      if (remainingMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
      }
      isConnecting.value = false;
      authenticatingProfileId.value = null;
    }
    return succeeded;
  }

  async function enterProfile(profile: ConnectionProfile): Promise<boolean> {
    connectionDialogOpen.value = false;
    return await authorizeProfile(profile);
  }

  function logout() {
    profileStorage.clearActiveProfile();
    connectionDialogOpen.value = false;
    lastError.value = "";
    Object.assign(connectionForm, {
      ...defaultConnectionForm(),
      profileId: connectionForm.profileId,
      profileName: connectionForm.profileName,
      mode: settings.mode,
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      remember: false,
    });
    onLogout?.();
  }

  instance = {
    profiles,
    connectionForm,
    isConnecting,
    isRestoringSession,
    authenticatingProfileId,
    selectedProfile,
    currentProfileLabel,
    connectionDialogOpen,
    connectionCloseConfirmOpen,
    profileValidationDialogOpen,
    profileValidationError,
    pendingDeleteProfile,
    loadProfile,
    openConnectionDialog,
    closeConnectionDialog,
    addProfile,
    persistConnection,
    editProfile,
    deleteProfile,
    confirmDeleteProfile,
    enterProfile,
    logout,
    setOnAuthenticated(hook: AuthenticatedHook | null) {
      onAuthenticated = hook;
    },
    setOnLogout(hook: LogoutHook | null) {
      onLogout = hook;
    },
  };
  return instance;
}
