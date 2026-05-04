import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { RestHeadscaleClient } from "./headscale-client";

type SeenRequest = {
  body: unknown;
  method: string;
  path: string;
  query: Record<string, string>;
  token: string | null;
};

let server: ReturnType<typeof Bun.serve>;
let seenRequests: SeenRequest[] = [];

function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, init);
}

async function requestBody(request: Request) {
  if (request.method === "GET" || request.method === "DELETE") {
    return null;
  }

  const text = await request.text();
  return text ? JSON.parse(text) : null;
}

function snapshotPayload() {
  const user = {
    id: "1",
    name: "alice",
    displayName: "Alice Ops",
    email: "alice@example.com",
    provider: "cli",
    createdAt: "2026-05-04T00:00:00Z",
  };
  const node = {
    id: "1",
    name: "alice-laptop",
    ipAddresses: ["100.64.0.1"],
    user,
    online: true,
    approvedRoutes: [],
    availableRoutes: ["10.42.0.0/16"],
    subnetRoutes: ["10.42.0.0/16"],
    tags: ["tag:workstation"],
  };

  return { node, user };
}

function responseFor(path: string) {
  const { node, user } = snapshotPayload();

  if (path === "/api/v1/health") {
    return { databaseConnectivity: true };
  }
  if (path === "/version") {
    return { version: "0.28.0" };
  }
  if (path === "/api/v1/user") {
    return { users: [user], user };
  }
  if (path.includes("/api/v1/user/")) {
    return { user: { ...user, name: "alice-admin" } };
  }
  if (path === "/api/v1/preauthkey") {
    return {
      preAuthKeys: [],
      preAuthKey: {
        id: "1",
        key: "preauthkey-demo",
        reusable: true,
        ephemeral: false,
        used: false,
        expiration: "2026-12-31T23:59:00Z",
        aclTags: ["tag:server"],
      },
    };
  }
  if (path === "/api/v1/node" || path.startsWith("/api/v1/node/")) {
    return { nodes: [node], node, changes: ["100.64.0.88 reserved"] };
  }
  if (path === "/api/v1/debug/node") {
    return { node: { ...node, id: "2", name: "debug-router" } };
  }
  if (path === "/api/v1/apikey") {
    return { apiKeys: [{ id: "1", prefix: "ak_live_demo" }], apiKey: "ak_live_demo.secret" };
  }
  if (path.startsWith("/api/v1/apikey/")) {
    return {};
  }
  if (path === "/api/v1/policy") {
    return { policy: '{"acls":[]}', updatedAt: "2026-05-04T00:00:00Z" };
  }

  return {};
}

beforeEach(() => {
  seenRequests = [];
  server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      seenRequests.push({
        body: await requestBody(request),
        method: request.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        token: request.headers.get("authorization"),
      });

      return json(responseFor(url.pathname));
    },
  });
});

afterEach(() => {
  server.stop(true);
});

function client() {
  return new RestHeadscaleClient({
    mode: "real",
    baseUrl: `http://127.0.0.1:${server.port}`,
    apiKey: "test-token",
  });
}

function seen(path: string, method?: string) {
  return seenRequests.find(
    (request) => request.path === path && (!method || request.method === method),
  );
}

describe("RestHeadscaleClient", () => {
  test("sends the expected Headscale REST calls for every client method", async () => {
    const api = client();

    await api.health();
    await api.version();
    await api.listUsers({ id: "1", name: "alice", email: "alice@example.com" });
    await api.createUser({
      name: "dana",
      displayName: "Dana",
      email: "dana@example.test",
      pictureUrl: "https://example.test/dana.png",
    });
    await api.renameUser({ id: "1", newName: "alice-admin" });
    await api.deleteUser({ id: "3" });
    await api.listPreAuthKeys();
    await api.createPreAuthKey({
      user: "1",
      reusable: true,
      ephemeral: false,
      expiration: "2026-12-31T23:59:00Z",
      aclTags: "tag:server,tag:router",
    });
    await api.expirePreAuthKey({ id: "1" });
    await api.deletePreAuthKey({ id: "2" });
    await api.listNodes({ user: "alice" });
    await api.getNode({ nodeId: "1" });
    await api.registerNode({ user: "1", key: "nodekey:pending-demo" });
    await api.debugCreateNode({
      user: "1",
      key: "nodekey:debug",
      name: "debug-router",
      routes: "10.10.0.0/16",
    });
    await api.renameNode({ nodeId: "1", newName: "alice-main" });
    await api.expireNode({ nodeId: "2", expiry: "2026-05-04T00:00:00Z" });
    await api.deleteNode({ nodeId: "3" });
    await api.setTags({ nodeId: "1", tags: "tag:server,tag:router" });
    await api.setApprovedRoutes({ nodeId: "2", routes: "10.42.0.0/16,0.0.0.0/0,::/0" });
    await api.backfillNodeIps({ confirmed: true });
    await api.listApiKeys();
    await api.createApiKey({ expiration: "2026-12-31T23:59:00Z" });
    await api.expireApiKey({ prefix: "ak_live_demo", id: "1" });
    await api.deleteApiKey({ prefix: "ak_old_demo", id: "2" });
    await api.getPolicy();
    await api.setPolicy({ policy: '{"acls":[]}' });

    expect(seenRequests.every((request) => request.token === "Bearer test-token")).toBe(true);
    expect(seen("/api/v1/health", "GET")).toBeTruthy();
    expect(seen("/version", "GET")).toBeTruthy();
    expect(seen("/api/v1/user", "GET")?.query).toEqual({
      email: "alice@example.com",
      id: "1",
      name: "alice",
    });
    expect(seen("/api/v1/user", "POST")?.body).toEqual({
      displayName: "Dana",
      email: "dana@example.test",
      name: "dana",
      pictureUrl: "https://example.test/dana.png",
    });
    expect(seen("/api/v1/user/1/rename/alice-admin", "POST")).toBeTruthy();
    expect(seen("/api/v1/user/3", "DELETE")).toBeTruthy();
    expect(seen("/api/v1/preauthkey", "POST")?.body).toEqual({
      aclTags: ["tag:server", "tag:router"],
      ephemeral: false,
      expiration: "2026-12-31T23:59:00Z",
      reusable: true,
      user: "1",
    });
    expect(seen("/api/v1/preauthkey/expire", "POST")?.body).toEqual({ id: "1" });
    expect(seen("/api/v1/preauthkey", "DELETE")?.query).toEqual({ id: "2" });
    expect(seen("/api/v1/node", "GET")?.query).toEqual({ user: "alice" });
    expect(seen("/api/v1/node/register", "POST")?.query).toEqual({
      key: "nodekey:pending-demo",
      user: "1",
    });
    expect(seen("/api/v1/debug/node", "POST")?.body).toEqual({
      key: "nodekey:debug",
      name: "debug-router",
      routes: ["10.10.0.0/16"],
      user: "1",
    });
    expect(seen("/api/v1/node/1/rename/alice-main", "POST")).toBeTruthy();
    expect(seen("/api/v1/node/2/expire", "POST")?.query).toEqual({
      expiry: "2026-05-04T00:00:00Z",
    });
    expect(seen("/api/v1/node/3", "DELETE")).toBeTruthy();
    expect(seen("/api/v1/node/1/tags", "POST")?.body).toEqual({
      tags: ["tag:server", "tag:router"],
    });
    expect(seen("/api/v1/node/2/approve_routes", "POST")?.body).toEqual({
      routes: ["10.42.0.0/16", "0.0.0.0/0", "::/0"],
    });
    expect(seen("/api/v1/node/backfillips", "POST")?.query).toEqual({ confirmed: "true" });
    expect(seen("/api/v1/apikey", "POST")?.body).toEqual({
      expiration: "2026-12-31T23:59:00Z",
    });
    expect(seen("/api/v1/apikey/expire", "POST")?.body).toEqual({
      id: "1",
      prefix: "ak_live_demo",
    });
    expect(seen("/api/v1/apikey/ak_old_demo", "DELETE")?.query).toEqual({ id: "2" });
    expect(seen("/api/v1/policy", "PUT")?.body).toEqual({ policy: '{"acls":[]}' });
  });
});
