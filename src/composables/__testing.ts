/**
 * Test-only entry point. Each composable in this folder caches a module-level
 * singleton instance (`let instance: ... | null = null`). Production never
 * needs to reset that — but Vitest's beforeEach does, so we expose a single
 * `resetAllSingletons()` orchestrator here instead of polluting every
 * composable's public API with `__reset*` exports.
 *
 * `bun test` / e2e import this; the production entry (`main.ts`) does not, so
 * the cost lives entirely in the test bundle.
 */

import { actionFeedbackTestingHandle } from "./useActionFeedback";
import { deviceSetupTestingHandle } from "./useDeviceSetup";
import { headscaleClientTestingHandle } from "./useHeadscaleClient";
import { policyDesignerTestingHandle } from "./usePolicyDesigner";
import { profilesTestingHandle } from "./useProfiles";
import { snapshotTestingHandle } from "./useSnapshot";
import { themeTestingHandle } from "./useTheme";

type TestingHandle = { reset(): void };

const handles: TestingHandle[] = [
  actionFeedbackTestingHandle,
  deviceSetupTestingHandle,
  headscaleClientTestingHandle,
  policyDesignerTestingHandle,
  profilesTestingHandle,
  snapshotTestingHandle,
  themeTestingHandle,
];

export function resetAllSingletons(): void {
  for (const handle of handles) handle.reset();
}
