import { useSnapshot } from "./useSnapshot";

/**
 * Per-dialog "refresh epoch" guard. Each call to `next()` invalidates earlier
 * epochs; `refresh(token, apply)` runs the snapshot fetch and applies the
 * result *only* if the token is still the latest epoch. `cancel()` is the
 * "close-the-dialog" shorthand for invalidating any in-flight refresh.
 *
 * Replaces the recurring `let xxxRefreshGeneration = 0; ... if (generation
 * !== xxxRefreshGeneration) return;` pattern that lived in every dialog
 * lifecycle.
 */
export function useRefreshGuard() {
  const { refreshSnapshot } = useSnapshot();
  let generation = 0;
  return {
    next(): number {
      generation += 1;
      return generation;
    },
    cancel(): void {
      generation += 1;
    },
    async refresh(token: number, apply: () => void): Promise<void> {
      await refreshSnapshot();
      if (token === generation) apply();
    },
  };
}
