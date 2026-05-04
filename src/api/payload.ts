import type { OperationField } from "@/domain/headscale-operations";
import type { OperationPayload } from "./types";

export function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createDefaultPayload(fields: readonly OperationField[]): OperationPayload {
  return fields.reduce<OperationPayload>((payload, field) => {
    if (field.defaultValue !== undefined) {
      payload[field.name] =
        field.type === "list" && typeof field.defaultValue === "string"
          ? field.defaultValue
          : field.defaultValue;
    } else {
      payload[field.name] = field.type === "checkbox" ? false : "";
    }

    return payload;
  }, {});
}

export function compactPayload(payload: OperationPayload): OperationPayload {
  const compacted: OperationPayload = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value === "" || value === undefined) {
      continue;
    }

    compacted[key] = value;
  }

  return compacted;
}
