import type { HeadscaleUser } from "@/api/types";

const TAG_MANAGED_USER_NAME = "tagged-devices";

export function isTagManagedDeviceUser(user?: HeadscaleUser): boolean {
  return user?.name === TAG_MANAGED_USER_NAME;
}

export function hasVisibleUser(user?: HeadscaleUser): user is HeadscaleUser {
  return Boolean(user && !isTagManagedDeviceUser(user));
}

export function userLabel(user: HeadscaleUser | undefined, fallback: string): string {
  return user?.displayName || user?.name || user?.email || fallback;
}
