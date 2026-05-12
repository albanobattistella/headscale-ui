import { computed, ref } from "vue";
import { type SnapshotSegment, useSnapshot } from "./useSnapshot";

export function useSegment(...segments: SnapshotSegment[]) {
  const { refreshSegments } = useSnapshot();
  const inFlight = ref(0);
  const isRefreshing = computed(() => inFlight.value > 0);

  async function refresh() {
    inFlight.value += 1;
    try {
      await refreshSegments(segments);
    } finally {
      inFlight.value = Math.max(0, inFlight.value - 1);
    }
  }

  return { isRefreshing, refresh };
}
