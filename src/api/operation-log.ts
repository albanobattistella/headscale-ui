import type { OperationId } from "@/domain/headscale-operations";

export function recordOperationCall(
  id: OperationId,
  method: string,
  url: string,
  payload: unknown,
) {
  if (!import.meta.env.DEV && import.meta.env.MODE !== "test") {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  window.__headscaleUiOperationCalls ??= [];
  window.__headscaleUiOperationCalls.push({ id, method, url, payload });
}
