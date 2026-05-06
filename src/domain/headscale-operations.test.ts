import { describe, expect, test } from "bun:test";
import { HEADSCALE_OPERATIONS, OPERATION_IDS } from "./headscale-operations";

describe("headscale operation registry", () => {
  test("keeps operation ids unique and all entries executable", () => {
    expect(new Set(OPERATION_IDS).size).toBe(OPERATION_IDS.length);
    expect(HEADSCALE_OPERATIONS.every((operation) => operation.path.length > 0)).toBe(true);
    expect(HEADSCALE_OPERATIONS.every((operation) => operation.method.length > 0)).toBe(true);
  });

  test("covers the stable Headscale v0.28 REST resources", () => {
    expect(OPERATION_IDS).toContain("health.check");
    expect(OPERATION_IDS).toContain("version.get");
    expect(OPERATION_IDS).toContain("user.create");
    expect(OPERATION_IDS).toContain("preauthkey.create");
    expect(OPERATION_IDS).toContain("node.setApprovedRoutes");
    expect(OPERATION_IDS).toContain("apikey.create");
    expect(OPERATION_IDS).toContain("policy.set");
  });

  test("tracks the latest Headscale auth request resources", () => {
    expect(OPERATION_IDS).toContain("auth.register");
    expect(OPERATION_IDS).toContain("auth.approve");
    expect(OPERATION_IDS).toContain("auth.reject");
  });

  test("does not expose policy editing as a raw JSON payload field", () => {
    const policySet = HEADSCALE_OPERATIONS.find((operation) => operation.id === "policy.set");

    expect(policySet).toBeDefined();
    expect(policySet?.fields).toEqual([]);
    expect(JSON.stringify(HEADSCALE_OPERATIONS)).not.toContain('"textarea"');
  });
});
