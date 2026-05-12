import { type Ref, reactive, ref } from "vue";
import type { HeadscaleNode } from "@/api/types";

export type AddDeviceTask = "server" | "client" | "pending";
type AddDeviceStep = "type" | "preferences" | "authKey" | "generate" | "pending" | "result";

interface PendingRegistrationForm {
  user: string;
  key: string;
  authId: string;
}

interface UseDeviceSetupReturn {
  open: Ref<boolean>;
  task: Ref<AddDeviceTask | null>;
  step: Ref<AddDeviceStep>;
  authKeyExpiryDays: Ref<number>;
  returnAfterInvite: Ref<boolean>;
  lastCreatedInvite: Ref<string>;
  lastRegisteredNode: Ref<HeadscaleNode | null>;
  authRequestResult: Ref<string>;
  pendingRegistrationForm: PendingRegistrationForm;
}

function defaultPendingRegistrationForm(): PendingRegistrationForm {
  return {
    user: "1",
    key: "nodekey:pending-demo",
    authId: "auth-demo",
  };
}

let instance: UseDeviceSetupReturn | null = null;

/** Internal: invoked by `__testing.ts` only. */
export const deviceSetupTestingHandle = {
  reset() {
    instance = null;
  },
};

export function useDeviceSetup(): UseDeviceSetupReturn {
  if (instance) return instance;

  const open = ref(false);
  const task = ref<AddDeviceTask | null>(null);
  const step = ref<AddDeviceStep>("type");
  const authKeyExpiryDays = ref(7);
  const returnAfterInvite = ref(false);
  const lastCreatedInvite = ref("");
  const lastRegisteredNode = ref<HeadscaleNode | null>(null);
  const authRequestResult = ref("");
  const pendingRegistrationForm = reactive<PendingRegistrationForm>(
    defaultPendingRegistrationForm(),
  );

  instance = {
    open,
    task,
    step,
    authKeyExpiryDays,
    returnAfterInvite,
    lastCreatedInvite,
    lastRegisteredNode,
    authRequestResult,
    pendingRegistrationForm,
  };
  return instance;
}
