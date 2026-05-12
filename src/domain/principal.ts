import type { HeadscaleUser } from "@/api/types";

export type Principal = string & { readonly __brand: "Principal" };

export function toPrincipal(raw: string): Principal {
  return raw.trim().toLowerCase() as Principal;
}

export class PrincipalIndex {
  private readonly known = new Set<Principal>();

  constructor(values: Iterable<string>) {
    for (const v of values) {
      if (v) this.known.add(toPrincipal(v));
    }
  }

  static fromUsers(users: readonly HeadscaleUser[]): PrincipalIndex {
    const values: string[] = [];
    for (const user of users) {
      if (user.email) values.push(user.email);
      if (user.name) values.push(user.name);
    }
    return new PrincipalIndex(values);
  }

  has(value: string): boolean {
    return this.known.has(toPrincipal(value));
  }
}
