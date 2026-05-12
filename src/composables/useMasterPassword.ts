import { type ComputedRef, computed, type Ref, ref, shallowRef } from "vue";
import {
  type ApiKeySecret,
  clearCanary,
  decryptApiKey,
  deriveKeyFromPassword,
  encryptApiKey,
  generateCanarySalt,
  getOrCreateDeviceKey,
  PBKDF2_DEFAULT_ITERATIONS,
  readCanaryMeta,
  verifyCanary,
  writeCanary,
} from "@/lib/api-key-crypto";
import { reencryptAll } from "@/lib/profile-storage";

export type MasterPasswordSingleton = {
  isPasswordEnabled: Ref<boolean>;
  isUnlocked: Ref<boolean>;
  needsUnlock: ComputedRef<boolean>;
  isReady: Ref<boolean>;
  initialize(): Promise<void>;
  encryptWithDeviceKey(plain: string): Promise<ApiKeySecret>;
  encryptApiKey(plain: string): Promise<ApiKeySecret>;
  decryptApiKey(secret: ApiKeySecret): Promise<string>;
  unlock(password: string): Promise<boolean>;
  lock(): void;
  enablePassword(password: string): Promise<void>;
  disablePassword(currentPassword: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
};

let instance: MasterPasswordSingleton | null = null;

/** Internal: invoked by tests only. */
export const masterPasswordTestingHandle = {
  reset() {
    instance = null;
  },
};

export function useMasterPassword(): MasterPasswordSingleton {
  if (instance) return instance;

  const isPasswordEnabled = ref(false);
  const isUnlocked = ref(false);
  const isReady = ref(false);
  // shallowRef for CryptoKey: Vue must not deeply track the opaque key object.
  const deviceKey = shallowRef<CryptoKey | null>(null);
  const unlockedKey = shallowRef<CryptoKey | null>(null);

  const needsUnlock = computed(() => isPasswordEnabled.value && !isUnlocked.value);

  async function initialize(): Promise<void> {
    deviceKey.value = await getOrCreateDeviceKey();
    const meta = await readCanaryMeta();
    isPasswordEnabled.value = meta !== null;
    isUnlocked.value = false;
    unlockedKey.value = null;
    isReady.value = true;
  }

  function activeKey(): CryptoKey {
    if (isPasswordEnabled.value) {
      if (!unlockedKey.value) {
        throw new Error("Master password is set but unlocked key is not available");
      }
      return unlockedKey.value;
    }
    if (!deviceKey.value) {
      throw new Error("Device key is not initialized; call useMasterPassword().initialize()");
    }
    return deviceKey.value;
  }

  function currentScheme(): "device" | "password" {
    return isPasswordEnabled.value ? "password" : "device";
  }

  async function encryptWithDeviceKey(plain: string): Promise<ApiKeySecret> {
    if (!deviceKey.value) {
      throw new Error("Device key is not initialized");
    }
    return encryptApiKey(plain, deviceKey.value, "device");
  }

  async function unlock(password: string): Promise<boolean> {
    const meta = await readCanaryMeta();
    if (!meta) {
      isPasswordEnabled.value = false;
      isUnlocked.value = false;
      unlockedKey.value = null;
      return false;
    }
    const candidate = await deriveKeyFromPassword(password, meta.salt, meta.iterations);
    const ok = await verifyCanary(candidate);
    if (!ok) return false;
    unlockedKey.value = candidate;
    isUnlocked.value = true;
    return true;
  }

  function lock(): void {
    unlockedKey.value = null;
    isUnlocked.value = false;
  }

  async function enablePassword(password: string): Promise<void> {
    if (isPasswordEnabled.value) {
      throw new Error("Password is already enabled");
    }
    if (!deviceKey.value) {
      throw new Error("Device key is not initialized");
    }
    const salt = generateCanarySalt();
    const iterations = PBKDF2_DEFAULT_ITERATIONS;
    const newKey = await deriveKeyFromPassword(password, salt, iterations);

    const dKey = deviceKey.value;
    await reencryptAll({
      transform: async (current) => {
        const plain = await decryptApiKey(current, dKey);
        return encryptApiKey(plain, newKey, "password");
      },
    });
    await writeCanary(newKey, salt, iterations);

    unlockedKey.value = newKey;
    isPasswordEnabled.value = true;
    isUnlocked.value = true;
  }

  async function disablePassword(currentPassword: string): Promise<void> {
    if (!isPasswordEnabled.value) {
      throw new Error("Password is not enabled");
    }
    if (!deviceKey.value) {
      throw new Error("Device key is not initialized");
    }
    const meta = await readCanaryMeta();
    if (!meta) {
      throw new Error("Password is enabled but canary metadata is missing");
    }
    const candidate = await deriveKeyFromPassword(currentPassword, meta.salt, meta.iterations);
    if (!(await verifyCanary(candidate))) {
      throw new Error("Incorrect current passphrase");
    }
    const dKey = deviceKey.value;

    await reencryptAll({
      transform: async (current) => {
        const plain = await decryptApiKey(current, candidate);
        return encryptApiKey(plain, dKey, "device");
      },
    });
    await clearCanary();

    unlockedKey.value = null;
    isPasswordEnabled.value = false;
    isUnlocked.value = false;
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!isPasswordEnabled.value) {
      throw new Error("Password is not enabled");
    }
    const meta = await readCanaryMeta();
    if (!meta) {
      throw new Error("Password is enabled but canary metadata is missing");
    }
    const oldKey = await deriveKeyFromPassword(currentPassword, meta.salt, meta.iterations);
    if (!(await verifyCanary(oldKey))) {
      throw new Error("Incorrect current passphrase");
    }
    const newSalt = generateCanarySalt();
    const iterations = PBKDF2_DEFAULT_ITERATIONS;
    const newKey = await deriveKeyFromPassword(newPassword, newSalt, iterations);

    await reencryptAll({
      transform: async (current) => {
        const plain = await decryptApiKey(current, oldKey);
        return encryptApiKey(plain, newKey, "password");
      },
    });
    await writeCanary(newKey, newSalt, iterations);

    unlockedKey.value = newKey;
    isUnlocked.value = true;
  }

  instance = {
    isPasswordEnabled,
    isUnlocked,
    needsUnlock,
    isReady,
    initialize,
    encryptWithDeviceKey,
    async encryptApiKey(plain: string) {
      return encryptApiKey(plain, activeKey(), currentScheme());
    },
    async decryptApiKey(secret: ApiKeySecret) {
      const key =
        secret.scheme === "password"
          ? (unlockedKey.value ??
            (() => {
              throw new Error("Cannot decrypt password-scheme secret while locked");
            })())
          : (deviceKey.value ??
            (() => {
              throw new Error("Device key is not initialized");
            })());
      return decryptApiKey(secret, key);
    },
    unlock,
    lock,
    enablePassword,
    disablePassword,
    changePassword,
  };

  return instance;
}
