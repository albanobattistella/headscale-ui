import { describe, expect, test } from "bun:test";
import { dateTimeLocalToIso, isoToDateTimeLocal } from "./create-auth-key-dialog";

describe("auth key date-time helpers", () => {
  test("round trips ISO timestamps through datetime-local values", () => {
    const iso = "2026-06-01T00:00:00.000Z";
    expect(dateTimeLocalToIso(isoToDateTimeLocal(iso))).toBe(iso);
  });

  test("returns an empty datetime-local value for invalid timestamps", () => {
    expect(isoToDateTimeLocal("not-a-date")).toBe("");
  });
});
