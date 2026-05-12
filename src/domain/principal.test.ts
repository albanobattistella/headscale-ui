import { describe, expect, test } from "bun:test";
import type { HeadscaleUser } from "@/api/types";
import { PrincipalIndex, toPrincipal } from "./principal";

function makeUser(over: Partial<HeadscaleUser>): HeadscaleUser {
  return {
    id: "1",
    name: "",
    displayName: "",
    email: "",
    providerId: "",
    provider: "",
    createdAt: "",
    profilePicUrl: "",
    ...over,
  } as HeadscaleUser;
}

describe("toPrincipal", () => {
  test("normalizes whitespace and case", () => {
    expect(toPrincipal("  Alice@Example.COM  ")).toBe("alice@example.com");
    expect(toPrincipal("Bob")).toBe("bob");
  });
});

describe("PrincipalIndex", () => {
  test("matches across case and whitespace variants", () => {
    const index = new PrincipalIndex(["Alice@Example.COM", "  bob  "]);
    expect(index.has("alice@example.com")).toBe(true);
    expect(index.has(" Alice@example.com ")).toBe(true);
    expect(index.has("BOB")).toBe(true);
    expect(index.has("carol")).toBe(false);
  });

  test("ignores empty strings", () => {
    const index = new PrincipalIndex(["", "alice@example.com", ""]);
    expect(index.has("")).toBe(false);
    expect(index.has("alice@example.com")).toBe(true);
  });

  test("fromUsers harvests both email and name", () => {
    const index = PrincipalIndex.fromUsers([
      makeUser({ email: "alice@example.com", name: "alice" }),
      makeUser({ email: "", name: "bob" }),
      makeUser({ email: "carol@example.com", name: "" }),
    ]);
    expect(index.has("ALICE@example.com")).toBe(true);
    expect(index.has("alice")).toBe(true);
    expect(index.has("BOB")).toBe(true);
    expect(index.has("carol@example.com")).toBe(true);
    expect(index.has("nobody")).toBe(false);
  });
});
