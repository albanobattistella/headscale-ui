import { reactive } from "vue";
import { RestHeadscaleClient } from "@/api/headscale-client";
import type { ConnectionSettings } from "@/api/http";
import { MockHeadscaleClient } from "@/api/mock-headscale-client";
import type { HeadscaleClient } from "@/api/types";

const localMockBaseUrl = "http://127.0.0.1:8080";

export interface UseHeadscaleClientReturn {
  settings: ConnectionSettings;
  mockClient: MockHeadscaleClient;
  setSettings(next: ConnectionSettings): void;
  createClient(override?: ConnectionSettings): HeadscaleClient;
}

let instance: UseHeadscaleClientReturn | null = null;

/** Internal: invoked by `__testing.ts` only. */
export const headscaleClientTestingHandle = {
  reset() {
    instance = null;
  },
};

export function useHeadscaleClient(): UseHeadscaleClientReturn {
  if (instance) return instance;
  const settings = reactive<ConnectionSettings>({
    mode: "mock",
    baseUrl: localMockBaseUrl,
    apiKey: "mock-api-key",
  });
  const mockClient = new MockHeadscaleClient();
  function createClient(override?: ConnectionSettings): HeadscaleClient {
    const target = override ?? settings;
    if (target.mode === "mock") {
      return mockClient;
    }
    return new RestHeadscaleClient(target);
  }
  instance = {
    settings,
    mockClient,
    setSettings(next: ConnectionSettings) {
      settings.mode = next.mode;
      settings.baseUrl = next.baseUrl;
      settings.apiKey = next.apiKey;
    },
    createClient,
  };
  return instance;
}
