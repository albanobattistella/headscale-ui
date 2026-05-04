import type { OperationId } from "@/domain/headscale-operations";

export function recordOperationCall(
  id: OperationId,
  method: string,
  url: string,
  payload: unknown,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.__headscaleUiOperationCalls ??= [];
  window.__headscaleUiOperationCalls.push({ id, method, url, payload });
}
