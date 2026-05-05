import { expect, test } from "bun:test";
import { isTimestampExpired, nodeConnectionStatus } from "./node-status";

const now = Date.parse("2026-05-05T00:00:00Z");
const expiredAt = "2026-05-04T00:00:00Z";
const futureExpiry = "2026-05-06T00:00:00Z";

test("detects timestamp expiration relative to a supplied clock", () => {
  expect(isTimestampExpired(expiredAt, now)).toBe(true);
  expect(isTimestampExpired(futureExpiry, now)).toBe(false);
  expect(isTimestampExpired(undefined, now)).toBe(false);
});

test("keeps online devices online even when their expiry timestamp is stale", () => {
  expect(nodeConnectionStatus({ online: true, expiry: expiredAt }, now)).toBe("online");
});

test("shows expired only for offline devices whose expiry timestamp is stale", () => {
  expect(nodeConnectionStatus({ online: false, expiry: expiredAt }, now)).toBe("expired");
  expect(nodeConnectionStatus({ online: false, expiry: futureExpiry }, now)).toBe("offline");
});
