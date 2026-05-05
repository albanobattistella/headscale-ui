import type { HeadscaleNode } from "@/api/types";

export type NodeConnectionStatus = "online" | "offline" | "expired";

export function isTimestampExpired(value?: string, now = Date.now()) {
  return Boolean(value && Date.parse(value) < now);
}

export function nodeConnectionStatus(
  node: Pick<HeadscaleNode, "online" | "expiry">,
  now = Date.now(),
): NodeConnectionStatus {
  if (node.online) {
    return "online";
  }

  if (isTimestampExpired(node.expiry, now)) {
    return "expired";
  }

  return "offline";
}
