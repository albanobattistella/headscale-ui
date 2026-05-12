import { type ComputedRef, computed, type Ref, reactive, ref } from "vue";
import type {
  HeadscaleClient,
  HeadscaleNode,
  HeadscaleSnapshot,
  HeadscaleUser,
  PreAuthKey,
} from "@/api/types";
import { isTimestampExpired } from "@/domain/node-status";
import { useActionFeedback } from "./useActionFeedback";
import { useHeadscaleClient } from "./useHeadscaleClient";

type ApplySnapshotHook = (next: HeadscaleSnapshot) => void;

interface UseSnapshotReturn {
  snapshot: Ref<HeadscaleSnapshot>;
  isAuthorized: Ref<boolean>;
  isRefreshing: ComputedRef<boolean>;
  refreshSnapshotInFlight: Ref<number>;
  renameDrafts: Record<string, string>;
  onlineNodes: ComputedRef<HeadscaleNode[]>;
  openInvites: ComputedRef<PreAuthKey[]>;
  routeNodes: ComputedRef<HeadscaleNode[]>;
  /** Find a node by id in the current snapshot (returns `undefined` if absent). */
  nodeById(id: string): HeadscaleNode | undefined;
  /** Find a user by id in the current snapshot (returns `undefined` if absent). */
  userById(id: string): HeadscaleUser | undefined;
  applySnapshot(next: HeadscaleSnapshot): void;
  applyOfflineHealth(): void;
  refreshSnapshot(): Promise<void>;
  setOnApplySnapshot(hook: ApplySnapshotHook | null): void;
}

let instance: UseSnapshotReturn | null = null;

/** Internal: invoked by `__testing.ts` only. */
export const snapshotTestingHandle = {
  reset() {
    instance = null;
  },
};

export async function fetchSnapshot(client: HeadscaleClient): Promise<HeadscaleSnapshot> {
  const [health, version, users, preAuthKeys, nodes, apiKeys, policy] = await Promise.all([
    client.health(),
    client.version(),
    client.listUsers({}),
    client.listPreAuthKeys(),
    client.listNodes({}),
    client.listApiKeys(),
    client.getPolicy(),
  ]);

  return {
    health,
    version,
    users: users.users,
    preAuthKeys: preAuthKeys.preAuthKeys,
    nodes: nodes.nodes,
    apiKeys: apiKeys.apiKeys,
    policy,
  };
}

export function useSnapshot(): UseSnapshotReturn {
  if (instance) return instance;

  const { mockClient, createClient } = useHeadscaleClient();
  const { lastError } = useActionFeedback();

  const snapshot = ref<HeadscaleSnapshot>(mockClient.snapshot);
  const isAuthorized = ref(false);
  const refreshSnapshotInFlight = ref(0);
  const renameDrafts = reactive<Record<string, string>>({});

  const isRefreshing = computed(() => refreshSnapshotInFlight.value > 0);
  const onlineNodes = computed(() => snapshot.value.nodes.filter((node) => node.online));
  const openInvites = computed(() =>
    snapshot.value.preAuthKeys.filter((key) => !key.used && !isTimestampExpired(key.expiration)),
  );
  const routeNodes = computed(() =>
    snapshot.value.nodes.filter(
      (node) => node.availableRoutes.length > 0 || node.approvedRoutes.length > 0,
    ),
  );

  let onApplySnapshot: ApplySnapshotHook | null = null;

  function applySnapshot(nextSnapshot: HeadscaleSnapshot) {
    snapshot.value = nextSnapshot;
    // Reset rename drafts to the fresh node set: drop entries for deleted nodes
    // and replace all values in a single reactive flush.
    for (const key of Object.keys(renameDrafts)) delete renameDrafts[key];
    for (const node of nextSnapshot.nodes) {
      renameDrafts[node.id] = node.givenName || node.name;
    }
    onApplySnapshot?.(nextSnapshot);
  }

  function applyOfflineHealth() {
    snapshot.value = {
      ...snapshot.value,
      health: {
        checkedAt: new Date().toISOString(),
        databaseConnectivity: false,
        serverReachable: false,
      },
    };
  }

  async function refreshSnapshot() {
    if (!isAuthorized.value) {
      return;
    }

    refreshSnapshotInFlight.value += 1;
    try {
      applySnapshot(await fetchSnapshot(createClient()));
      lastError.value = "";
    } catch (error) {
      applyOfflineHealth();
      lastError.value = error instanceof Error ? error.message : String(error);
    } finally {
      refreshSnapshotInFlight.value = Math.max(0, refreshSnapshotInFlight.value - 1);
    }
  }

  function setOnApplySnapshot(hook: ApplySnapshotHook | null) {
    onApplySnapshot = hook;
  }

  instance = {
    snapshot,
    isAuthorized,
    isRefreshing,
    refreshSnapshotInFlight,
    renameDrafts,
    onlineNodes,
    openInvites,
    routeNodes,
    nodeById: (id) => snapshot.value.nodes.find((n) => n.id === id),
    userById: (id) => snapshot.value.users.find((u) => u.id === id),
    applySnapshot,
    applyOfflineHealth,
    refreshSnapshot,
    setOnApplySnapshot,
  };
  return instance;
}
