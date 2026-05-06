import type { OperationId } from "@/domain/headscale-operations";
import type { HeadscaleClient, OperationPayload } from "./types";

type OperationRunner = (payload: OperationPayload) => Promise<unknown>;

export function createOperationRunners(client: HeadscaleClient) {
  return {
    "health.check": () => client.health(),
    "version.get": () => client.version(),
    "user.list": (payload) => client.listUsers(payload),
    "user.create": (payload) => client.createUser(payload),
    "user.rename": (payload) => client.renameUser(payload),
    "user.delete": (payload) => client.deleteUser(payload),
    "preauthkey.list": () => client.listPreAuthKeys(),
    "preauthkey.create": (payload) => client.createPreAuthKey(payload),
    "preauthkey.expire": (payload) => client.expirePreAuthKey(payload),
    "preauthkey.delete": (payload) => client.deletePreAuthKey(payload),
    "node.list": (payload) => client.listNodes(payload),
    "node.get": (payload) => client.getNode(payload),
    "node.register": (payload) => client.registerNode(payload),
    "auth.register": (payload) => client.authRegister(payload),
    "auth.approve": (payload) => client.authApprove(payload),
    "auth.reject": (payload) => client.authReject(payload),
    "node.debugCreate": (payload) => client.debugCreateNode(payload),
    "node.rename": (payload) => client.renameNode(payload),
    "node.expire": (payload) => client.expireNode(payload),
    "node.delete": (payload) => client.deleteNode(payload),
    "node.setTags": (payload) => client.setTags(payload),
    "node.setApprovedRoutes": (payload) => client.setApprovedRoutes(payload),
    "node.backfillIps": (payload) => client.backfillNodeIps(payload),
    "apikey.list": () => client.listApiKeys(),
    "apikey.create": (payload) => client.createApiKey(payload),
    "apikey.expire": (payload) => client.expireApiKey(payload),
    "apikey.delete": (payload) => client.deleteApiKey(payload),
    "policy.get": () => client.getPolicy(),
    "policy.set": (payload) => client.setPolicy(payload),
  } satisfies Record<OperationId, OperationRunner>;
}

export async function runHeadscaleOperation(
  client: HeadscaleClient,
  id: OperationId,
  payload: OperationPayload,
) {
  return createOperationRunners(client)[id](payload);
}
