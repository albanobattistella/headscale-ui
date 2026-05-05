import { beforeEach, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-vue";
import { createRouter, createWebHistory } from "vue-router";
import { i18n } from "@/i18n";
import { routes } from "@/router";
import "@/styles/globals.css";
import DashboardView from "@/views/DashboardView.vue";

type StoredProfile = {
  id: string;
  name: string;
  baseUrl: string;
};

function storedProfiles() {
  return JSON.parse(localStorage.getItem("headscale-ui-profiles") ?? "[]") as StoredProfile[];
}

beforeEach(async () => {
  await page.viewport(1366, 768);
  document.body.innerHTML = "";
  localStorage.clear();
  i18n.global.locale.value = "en";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  window.__headscaleUiOperationCalls = [];
});

async function renderLogin(path = "/") {
  window.history.pushState({}, "", path);
  const testRouter = createRouter({
    history: createWebHistory(),
    routes,
  });
  const rendered = await render(DashboardView, {
    global: {
      plugins: [i18n, testRouter],
    },
  });
  await testRouter.isReady();
  return rendered;
}

async function connectWithDefaults() {
  await page.getByTestId("connect-submit").click();
  await expect.element(page.getByTestId("profile-menu-trigger")).toBeVisible();
}

async function openCreateMemberDialog() {
  await page.getByTestId("open-create-member").click();
  await expect.element(page.getByTestId("member-create-dialog")).toBeVisible();
}

function expectNoHorizontalOverflow() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

function expectPointerCursor(testId: string) {
  const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(element).toBeTruthy();
  expect(getComputedStyle(element as HTMLElement).cursor).toBe("pointer");
}

function visibleSectionButtons() {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>('button[data-testid^="section-"]'),
  ).filter((element) => element.getBoundingClientRect().width > 0);
}

function expectResponsiveTabMenu() {
  const buttons = visibleSectionButtons();
  expect(buttons.length).toBeGreaterThan(1);
  expect(document.querySelector('[data-testid="section-select"]')).toBeNull();
  const rects = buttons.map((button) => button.getBoundingClientRect());
  for (let index = 1; index < rects.length; index += 1) {
    expect(Math.abs(rects[index].top - rects[0].top)).toBeLessThan(2);
  }
}

function testIdRect(testId: string) {
  const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(element).toBeTruthy();
  return (element as HTMLElement).getBoundingClientRect();
}

function expectAuthKeyDateTimePickerClosed() {
  const picker = document.querySelector<HTMLElement>('[data-slot="date-time-picker"]');
  expect(picker).toBeTruthy();
  expectNoHorizontalOverflow();

  expect(getComputedStyle(picker as HTMLElement).display).toBe("grid");
  expect(testIdRect("invite-expiration").width).toBeGreaterThan(0);
  expect(document.querySelector('[data-testid="invite-expiration-hour"]')).toBeNull();
  expect(document.querySelector('[data-testid="invite-expiration-minute"]')).toBeNull();
}

function expectAuthKeyTimePickerPopover() {
  const timePicker = document.querySelector<HTMLElement>('[data-slot="time-picker"]');
  expect(timePicker).toBeTruthy();
  expectNoHorizontalOverflow();

  const hourRect = testIdRect("invite-expiration-hour");
  const minuteRect = testIdRect("invite-expiration-minute");
  expect(Math.abs(hourRect.top - minuteRect.top)).toBeLessThan(2);
  expect(hourRect.right).toBeLessThanOrEqual(minuteRect.left);
  expect(document.querySelectorAll('input[type="time"], input[type="datetime-local"]').length).toBe(
    0,
  );
}

function expectAppHeader() {
  const header = document.querySelector<HTMLElement>('[data-testid="app-header"]');
  const primaryRow = document.querySelector<HTMLElement>('[data-testid="header-primary-row"]');
  const navigation = document.querySelector<HTMLElement>('[data-testid="header-navigation"]');
  const pageBody = document.querySelector<HTMLElement>('[data-testid="page-body"]');
  expect(header?.getBoundingClientRect().width).toBe(window.innerWidth);
  expect(primaryRow).toBeTruthy();
  expect(navigation).toBeTruthy();
  expect(primaryRow?.parentElement?.className).toContain("container");
  expect(pageBody?.className).toContain("container");
  expect(pageBody?.className).toContain("mx-auto");
  expect(document.querySelector<HTMLElement>('[data-testid="app-logo"]')?.textContent).toContain(
    "Headscale UI",
  );
  expect(document.querySelector<SVGElement>('[data-testid="app-logo"] svg')).toBeTruthy();
  expect(document.querySelector<HTMLElement>('[data-testid="profile-menu-trigger"]')).toBeTruthy();
  expect(document.querySelector<HTMLElement>('[data-testid="current-server"]')).toBeNull();

  const headerRect = header?.getBoundingClientRect();
  const primaryRect = primaryRow?.getBoundingClientRect();
  const navigationRect = navigation?.getBoundingClientRect();
  const headerStyle = getComputedStyle(header as HTMLElement);
  const pageSurfaceStyle = getComputedStyle(document.body);
  expect(headerStyle.borderBottomWidth).toBe("0px");
  expect(headerStyle.boxShadow).not.toBe("none");
  expect(headerStyle.backgroundColor).not.toBe(pageSurfaceStyle.backgroundColor);
  expect(primaryRect?.top ?? 0).toBeGreaterThanOrEqual((headerRect?.top ?? 0) - 1);
  expect(navigationRect?.top ?? 0).toBeGreaterThanOrEqual((primaryRect?.bottom ?? 0) - 1);
  expect(navigationRect?.top ?? 0).toBeLessThanOrEqual((primaryRect?.bottom ?? 0) + 1);
  expect(navigationRect?.bottom ?? 0).toBeLessThanOrEqual((headerRect?.bottom ?? 0) + 1);
  expect(getComputedStyle(navigation as HTMLElement).borderTopWidth).toBe("0px");

  const activeTab = navigation?.querySelector<HTMLElement>('[data-state="active"]');
  expect(activeTab).toBeTruthy();
  expect(activeTab?.className).toContain("text-primary");
}

function expectMachinesWorkbench() {
  expect(document.querySelector<HTMLElement>('[data-testid="machines-workbench"]')).toBeTruthy();
  expect(document.querySelector<HTMLElement>('[data-testid="machine-toolbar"]')).toBeTruthy();
  expect(document.querySelector<HTMLElement>('[data-testid="machine-list"]')).toBeTruthy();
  expect(document.querySelector<HTMLElement>('[data-testid="device-1"]')).toBeTruthy();
  expect(document.querySelector('[data-testid="device-1"]')?.closest("table")).toBeTruthy();
  expect(
    document
      .querySelector('[data-testid="device-search"]')
      ?.closest('[data-testid="machine-list"]'),
  ).toBeNull();
  expect(
    document
      .querySelector('[data-testid="device-search"]')
      ?.closest('[data-testid="machine-toolbar"]'),
  ).toBeTruthy();
}

function countByTestIdPrefix(prefix: string) {
  return document.querySelectorAll<HTMLElement>(`[data-testid^="${prefix}"]`).length;
}

function clickLastByTestIdPrefix(prefix: string) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(`[data-testid^="${prefix}"]`));
  const element = elements.at(-1);
  expect(element).toBeTruthy();
  element?.click();
}

function latestSavedPolicy() {
  const policyCall = window.__headscaleUiOperationCalls
    ?.filter((call) => call.id === "policy.set")
    .at(-1);
  expect(policyCall).toBeTruthy();
  const payload = policyCall?.payload as { policy?: string };
  expect(typeof payload.policy).toBe("string");
  return JSON.parse(payload.policy ?? "{}") as {
    acls?: Array<{ action: string; src: string[]; dst: string[] }>;
    groups?: Record<string, string[]>;
    tagOwners?: Record<string, string[]>;
    ssh?: unknown;
  };
}

function expectNoRawPolicyEditor() {
  const editor = document.querySelector<HTMLElement>('[data-testid="policy-editor"]');
  expect(editor).toBeTruthy();
  expect(editor?.querySelector("textarea")).toBeNull();
  expect(editor?.querySelector('[contenteditable="true"]')).toBeNull();
  expect(editor?.querySelector("pre, code")).toBeNull();
  expect(editor?.querySelector(".cm-editor, .monaco-editor")).toBeNull();
}

function clickDomTestId(testId: string) {
  const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(element).toBeTruthy();
  element?.click();
}

function inputDomTestId(testId: string, value: string) {
  const element = document.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`);
  expect(element).toBeTruthy();
  if (!element) {
    return;
  }
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function selectDomTestId(testId: string, value: string) {
  const element = document.querySelector<HTMLSelectElement>(`[data-testid="${testId}"]`);
  expect(element).toBeTruthy();
  if (!element) {
    return;
  }
  element.value = value;
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function stubDownloads() {
  const downloads: string[] = [];
  const objectTypes: string[] = [];
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalAnchorClick = HTMLAnchorElement.prototype.click;

  URL.createObjectURL = ((blob: Blob) => {
    objectTypes.push(blob.type);
    return `blob:headscale-ui-${objectTypes.length}`;
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
  HTMLAnchorElement.prototype.click = function clickAnchor() {
    downloads.push(this.download);
  };

  return {
    downloads,
    objectTypes,
    restore() {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    },
  };
}

function stubClipboard() {
  const writes: string[] = [];
  const ownDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const prototypeDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, "clipboard");

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value: string) => {
        writes.push(value);
      },
    },
  });

  return {
    writes,
    restore() {
      if (ownDescriptor) {
        Object.defineProperty(navigator, "clipboard", ownDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
      if (prototypeDescriptor) {
        Object.defineProperty(Navigator.prototype, "clipboard", prototypeDescriptor);
      }
    },
  };
}

async function openProfileMenu() {
  const menu = document.querySelector<HTMLElement>('[data-testid="profile-menu"]');
  if (!menu || menu.getBoundingClientRect().width === 0) {
    await page.getByTestId("profile-menu-trigger").click();
  }
  await expect.element(page.getByTestId("profile-menu")).toBeVisible();
}

async function closeProfileMenu() {
  const menu = document.querySelector<HTMLElement>('[data-testid="profile-menu"]');
  if (menu && menu.getBoundingClientRect().width > 0) {
    await userEvent.keyboard("{Escape}");
  }
}

async function chooseProfileMenuOption(testId: string) {
  await openProfileMenu();
  if (testId.startsWith("locale-option-")) {
    await page.getByTestId("language-menu-trigger").hover();
  }
  if (testId.startsWith("theme-option-")) {
    await page.getByTestId("theme-menu-trigger").hover();
  }
  await expect.element(page.getByTestId(testId)).toBeVisible();
  await page.getByTestId(testId).click();
}

async function selectSectionTab(section: string) {
  await page.getByTestId(`section-${section}`).click();
  expect(window.location.pathname.endsWith(`/${section}`)).toBe(true);
}

test("manages multiple saved connection profiles and supports logout", async () => {
  const rendered = await renderLogin();

  await expect.element(page.getByTestId("connect-form")).toBeVisible();
  await page.getByTestId("connect-profile-name").fill("Office");
  await page.getByTestId("connect-api-key").fill("office-api-key");
  await page.getByTestId("save-profile").click();
  expect(localStorage.getItem("headscale-ui-profiles")).toContain("Office");
  const officeProfile = storedProfiles().find((profile) => profile.name === "Office");
  expect(officeProfile?.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
  await expect.element(page.getByTestId("profile-row-Office")).toBeVisible();

  await page.getByTestId("connect-profile").selectOptions("__new__");
  await page.getByTestId("connect-profile-name").fill("Lab");
  await page.getByTestId("connect-api-key").fill("lab-api-key");
  await page.getByTestId("save-profile").click();
  expect(localStorage.getItem("headscale-ui-profiles")).toContain("Office");
  expect(localStorage.getItem("headscale-ui-profiles")).toContain("Lab");

  await page.getByTestId("use-profile-Office").click();
  await expect.element(page.getByTestId("connect-server-url")).toHaveValue("http://127.0.0.1:8080");
  await page.getByTestId("connect-submit").click();
  await expect.element(page.getByTestId("section-home")).toBeVisible();
  await openProfileMenu();
  await expect.element(page.getByTestId("profile-menu")).toHaveTextContent("Office");
  expect(document.querySelector('[data-testid="current-server"]')).toBeNull();
  await closeProfileMenu();
  expect(window.location.pathname).toBe(`/${officeProfile?.id}/home`);
  await page.getByTestId("section-devices").click();
  expect(window.location.pathname).toBe(`/${officeProfile?.id}/devices`);
  expectMachinesWorkbench();

  const profileRoute = window.location.pathname;
  await rendered.unmount();
  await renderLogin(profileRoute);
  await expect.element(page.getByTestId("section-devices")).toBeVisible();
  await openProfileMenu();
  await expect.element(page.getByTestId("profile-menu")).toHaveTextContent("Office");
  await closeProfileMenu();

  expect(document.querySelector("#server-url")).toBeNull();
  expect(document.querySelector("#api-key")).toBeNull();
  expect(localStorage.getItem("headscale-ui-active-profile")).toBeTruthy();

  await page.getByTestId("profile-menu-trigger").click();
  await openProfileMenu();
  await page.getByTestId("logout").click();
  await expect.element(page.getByTestId("connect-form")).toBeVisible();
  window.__headscaleUiOperationCalls = [];
  await new Promise((resolve) => window.setTimeout(resolve, 5200));
  expect(window.__headscaleUiOperationCalls).toEqual([]);
  expect(window.location.pathname).toBe("/");
  expect(localStorage.getItem("headscale-ui-active-profile")).toBeNull();
  expect(localStorage.getItem("headscale-ui-profiles")).toContain("Office");

  await page.getByTestId("delete-profile-Office").click();
  expect(localStorage.getItem("headscale-ui-profiles")).not.toContain("Office");
  expect(localStorage.getItem("headscale-ui-profiles")).toContain("Lab");
});

test("does not flash the login form while restoring a profile route", async () => {
  const profile = {
    id: "profile-office",
    name: "Office",
    mode: "mock",
    baseUrl: "http://127.0.0.1:8080",
    apiKey: "office-api-key",
    updatedAt: "2026-05-04T00:00:00.000Z",
  };
  localStorage.setItem("headscale-ui-profiles", JSON.stringify([profile]));
  localStorage.setItem("headscale-ui-active-profile", profile.id);

  await renderLogin(`/${profile.id}/devices`);

  expect(document.querySelector('[data-testid="connect-form"]')).toBeNull();
  await expect.element(page.getByTestId("section-devices")).toBeVisible();
  expectMachinesWorkbench();
  expect(window.location.pathname).toBe(`/${profile.id}/devices`);
});

test("normalizes stale mock profiles with remote URLs into real profiles", async () => {
  localStorage.setItem(
    "headscale-ui-profiles",
    JSON.stringify([
      {
        id: "profile-office",
        name: "Office",
        mode: "mock",
        baseUrl: "http://office.example.test",
        apiKey: "office-api-key",
        updatedAt: "2026-05-04T00:00:00.000Z",
      },
    ]),
  );

  await renderLogin();

  await page.getByTestId("use-profile-Office").click();
  await expect.element(page.getByTestId("connect-mode")).toHaveValue("real");
  await expect
    .element(page.getByTestId("connect-server-url"))
    .toHaveValue("http://office.example.test");
});

test("keeps the login panel open when a real server is unreachable", async () => {
  await renderLogin();

  await page.getByTestId("connect-mode").selectOptions("real");
  await page.getByTestId("connect-profile-name").fill("Offline");
  await page.getByTestId("connect-server-url").fill("http://127.0.0.1:9");
  await page.getByTestId("connect-api-key").fill("offline-api-key");
  await page.getByTestId("connect-submit").click();

  await expect.element(page.getByTestId("connect-error")).toBeVisible();
  await expect.element(page.getByTestId("connect-form")).toBeVisible();
  expect(document.querySelector('[data-testid="section-home"]')).toBeNull();
  expect(localStorage.getItem("headscale-ui-active-profile")).toBeNull();
});

test("supports language and theme selectors before login", async () => {
  await renderLogin();

  await page.getByTestId("locale-select").selectOptions("zh");
  expect(document.documentElement.lang).toBe("zh");
  await expect.element(page.getByTestId("connect-submit")).toHaveTextContent("连接");

  await page.getByTestId("theme-select").selectOptions("dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(localStorage.getItem("headscale-ui-theme")).toBe("dark");

  await page.getByTestId("theme-select").selectOptions("auto");
  expect(localStorage.getItem("headscale-ui-theme")).toBe("auto");
});

test("uses pointer cursors for clickable controls and links", async () => {
  await renderLogin();

  expectPointerCursor("connect-submit");
  expectPointerCursor("save-profile");

  await connectWithDefaults();
  expectPointerCursor("profile-menu-trigger");
  expectPointerCursor("section-routes");
  expectPointerCursor("refresh-data");

  await page.getByTestId("section-devices").click();
  expectPointerCursor("install-docs-link");
  expectPointerCursor("add-device-toggle");

  await page.getByTestId("section-routes").click();
  expectPointerCursor("route-machine-link-2");
  expectPointerCursor("route-user-link-2");
  expectPointerCursor("approve-routes-2");

  await openProfileMenu();
  expectPointerCursor("language-menu-trigger");
  await page.getByTestId("language-menu-trigger").hover();
  await expect.element(page.getByTestId("locale-option-zh")).toBeVisible();
  expectPointerCursor("locale-option-zh");
  await closeProfileMenu();
});

test("supports consumer-friendly tailnet management flows", async () => {
  window.__headscaleUiOperationCalls = [];

  await renderLogin();
  await expect.element(page.getByTestId("connect-form")).toBeVisible();
  await connectWithDefaults();
  expectAppHeader();
  expectResponsiveTabMenu();

  await page.getByTestId("section-members").click();
  await openCreateMemberDialog();
  await page.getByTestId("member-name").fill("dana");
  await page.getByTestId("member-display").fill("Dana");
  await page.getByTestId("member-email").fill("dana@example.test");
  await page.getByTestId("create-member").click();
  await expect.element(page.getByTestId("member-dana")).toBeVisible();

  await page.getByTestId("section-invites").click();
  await page.getByTestId("open-create-invite").click();
  await page.getByTestId("invite-tags").fill("tag:workstation");
  await page.getByTestId("create-invite").click();
  await expect.element(page.getByTestId("created-invite")).toBeVisible();

  await page.getByTestId("section-devices").click();
  expectMachinesWorkbench();
  await page.getByTestId("machine-filter").selectOptions("routes");
  await page.getByTestId("device-pending-routes-2").click();
  await expect.element(page.getByTestId("route-node-2")).toBeVisible();
  expect(window.location.pathname.endsWith("/routes")).toBe(true);
  await page.getByTestId("section-devices").click();
  await page.getByTestId("machine-filter").selectOptions("all");
  expect(document.querySelector('[data-testid="machine-actions-1"]')).toBeNull();
  await page.getByTestId("machine-actions-trigger-1").click();
  await expect.element(page.getByTestId("machine-actions-menu-1")).toBeVisible();
  expect(document.querySelector('[data-testid="rename-node-1"]')).toBeNull();
  await page.getByTestId("rename-node-action-1").click();
  await expect.element(page.getByTestId("rename-node-dialog")).toBeVisible();
  await page.getByTestId("rename-node-dialog-input").fill("alice-main");
  await page.getByTestId("rename-node-confirm").click();
  await expect.element(page.getByTestId("device-1")).toHaveTextContent("alice-main");

  window.__headscaleUiOperationCalls = [];
  await page.getByTestId("section-routes").click();
  await expect.element(page.getByTestId("route-available-2-0")).toHaveTextContent("10.42.0.0/16");
  await expect.element(page.getByTestId("route-approved-2-0")).toHaveTextContent("10.42.0.0/16");
  expect(document.querySelector('[data-testid="pending-routes-list-2"]')).toBeTruthy();
  await expect.element(page.getByTestId("pending-route-2-0")).toHaveTextContent("0.0.0.0/0");
  await expect.element(page.getByTestId("pending-route-value-2-0")).toHaveTextContent("0.0.0.0/0");
  await page.getByTestId("approve-route-2-0").click();
  await expect.element(page.getByTestId("approve-route-dialog")).toBeVisible();
  await expect.element(page.getByTestId("approve-route-target")).toHaveTextContent("0.0.0.0/0");
  expect(
    window.__headscaleUiOperationCalls?.some((call) => call.id === "node.setApprovedRoutes"),
  ).toBe(false);
  await page.getByTestId("approve-route-confirm").click();
  await expect
    .poll(() =>
      window.__headscaleUiOperationCalls?.some((call) => call.id === "node.setApprovedRoutes"),
    )
    .toBe(true);
  const routeApprovalCall = window.__headscaleUiOperationCalls?.find(
    (call) => call.id === "node.setApprovedRoutes",
  );
  const routeApprovalPayload = routeApprovalCall?.payload as { nodeId?: string; routes?: string };
  expect(routeApprovalPayload.nodeId).toBe("2");
  expect(routeApprovalPayload.routes).toBe("10.42.0.0/16,0.0.0.0/0");
  expect(routeApprovalPayload.routes).not.toContain("::/0");

  expect(document.body.textContent).not.toContain("/api/v1/node");
  expect(document.querySelector('[data-testid="run-operation"]')).toBeNull();
});

test("covers dashboard refresh, machine filters, exports and machine lifecycle actions", async () => {
  await renderLogin();
  await connectWithDefaults();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("refresh-data").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "health.check"))
    .toBe(true);
  await expect.element(page.getByTestId("header-server-signal")).toBeVisible();
  expect(
    document.querySelector('[data-testid="header-server-signal"]')?.getAttribute("title"),
  ).toContain("Server ready");
  expect(document.querySelector('[data-testid="overview-health-metrics"]')).toBeNull();
  expect(document.querySelector('[data-testid="overview-server-health"]')).toBeNull();
  expect(document.querySelector('[data-testid="overview-server-reachability"]')).toBeNull();
  expect(document.querySelector('[data-testid="overview-database-health"]')).toBeNull();
  const healthCallsAfterRefresh =
    window.__headscaleUiOperationCalls?.filter((call) => call.id === "health.check").length ?? 0;
  await expect
    .poll(
      () =>
        (window.__headscaleUiOperationCalls?.filter((call) => call.id === "health.check").length ??
          0) > healthCallsAfterRefresh,
      { timeout: 6000 },
    )
    .toBe(true);

  await page.getByTestId("section-devices").click();
  expectMachinesWorkbench();
  await page.getByTestId("device-search").fill("edge");
  expect(document.querySelector('[data-testid="device-1"]')).toBeNull();
  await page.getByTestId("machine-filter").selectOptions("routes");
  await expect.element(page.getByTestId("device-2")).toBeVisible();
  await page.getByTestId("clear-machine-filters").click();
  expectMachinesWorkbench();

  const downloadStub = stubDownloads();
  try {
    await page.getByTestId("export-machines").click();
    expect(downloadStub.downloads).toContain("headscale-machines.csv");
    expect(downloadStub.objectTypes).toContain("text/csv;charset=utf-8");
  } finally {
    downloadStub.restore();
  }

  await page.getByTestId("machine-actions-trigger-3").click();
  await expect.element(page.getByTestId("machine-actions-menu-3")).toBeVisible();
  const expireCallsBefore =
    window.__headscaleUiOperationCalls?.filter((call) => call.id === "node.expire").length ?? 0;
  await page.getByTestId("expire-node-action-3").click();
  await expect.element(page.getByTestId("expire-node-dialog")).toBeVisible();
  expect(
    window.__headscaleUiOperationCalls?.filter((call) => call.id === "node.expire").length,
  ).toBe(expireCallsBefore);
  await page.getByTestId("expire-node-confirm").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "node.expire"))
    .toBe(true);
  await page.getByTestId("machine-actions-trigger-3").click();
  await expect.element(page.getByTestId("machine-actions-menu-3")).toBeVisible();
  const deleteCallsBefore =
    window.__headscaleUiOperationCalls?.filter((call) => call.id === "node.delete").length ?? 0;
  await page.getByTestId("remove-node-action-3").click();
  await expect.element(page.getByTestId("remove-node-dialog")).toBeVisible();
  expect(
    window.__headscaleUiOperationCalls?.filter((call) => call.id === "node.delete").length,
  ).toBe(deleteCallsBefore);
  await page.getByTestId("remove-node-cancel").click();
  expect(
    window.__headscaleUiOperationCalls?.filter((call) => call.id === "node.delete").length,
  ).toBe(deleteCallsBefore);
  await page.getByTestId("machine-actions-trigger-3").click();
  await page.getByTestId("remove-node-action-3").click();
  await expect.element(page.getByTestId("remove-node-dialog")).toBeVisible();
  await page.getByTestId("remove-node-confirm").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "node.delete"))
    .toBe(true);
  expect(document.querySelector('[data-testid="device-3"]')).toBeNull();
});

test("covers user filters, user export and member deletion", async () => {
  await renderLogin();
  await connectWithDefaults();

  await page.getByTestId("section-members").click();
  expect(document.querySelector('[data-testid="member-alice"]')?.closest("table")).toBeTruthy();
  expect(
    document.querySelector('[data-testid="user-search"]')?.closest('[data-testid="user-table"]'),
  ).toBeNull();
  expect(
    document.querySelector('[data-testid="user-search"]')?.closest('[data-testid="user-toolbar"]'),
  ).toBeTruthy();
  inputDomTestId("user-search", "charlie");
  await expect.element(page.getByTestId("member-charlie")).toBeVisible();
  expect(document.querySelector('[data-testid="member-alice"]')).toBeNull();
  inputDomTestId("user-search", "");
  selectDomTestId("user-filter", "service");
  await expect.element(page.getByTestId("member-tagged-devices")).toBeVisible();
  expect(document.querySelector('[data-testid="member-charlie"]')).toBeNull();

  const downloadStub = stubDownloads();
  try {
    await page.getByTestId("export-users").click();
    expect(downloadStub.downloads).toContain("headscale-users.csv");
  } finally {
    downloadStub.restore();
  }

  selectDomTestId("user-filter", "all");
  await openCreateMemberDialog();
  await page.getByTestId("member-name").fill("erin");
  await page.getByTestId("member-display").fill("Erin");
  await page.getByTestId("member-email").fill("erin@example.test");
  await page.getByTestId("create-member").click();
  await expect.element(page.getByTestId("member-erin")).toBeVisible();
  await page.getByTestId("delete-member-erin").click();
  expect(document.querySelector('[data-testid="member-erin"]')).toBeNull();
});

test("covers auth-key filters, expiration and deletion", async () => {
  await renderLogin();
  await connectWithDefaults();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("section-invites").click();
  await expect.element(page.getByTestId("invite-table")).toBeVisible();
  expect(document.querySelector('[data-testid="invite-1"]')?.closest("table")).toBeTruthy();
  expect(
    document
      .querySelector('[data-testid="invite-search"]')
      ?.closest('[data-testid="invite-toolbar"]'),
  ).toBeTruthy();
  expect(
    document
      .querySelector('[data-testid="invite-search"]')
      ?.closest('[data-testid="invite-table"]'),
  ).toBeNull();
  expect(
    document.querySelector<HTMLElement>('[data-testid="invite-toolbar"]')?.getBoundingClientRect()
      .height ?? 0,
  ).toBeLessThanOrEqual(60);
  expect(
    document.querySelector<HTMLElement>('[data-testid="invite-filter"]')?.getBoundingClientRect()
      .height ?? 0,
  ).toBeGreaterThanOrEqual(36);
  expect(
    document.querySelector<HTMLElement>('[data-testid="invite-1"]')?.getBoundingClientRect()
      .height ?? 0,
  ).toBeLessThanOrEqual(88);
  expect(
    document.querySelector<HTMLElement>('[data-testid="invite-status-1"]')?.className,
  ).toContain("emerald");
  expect(
    document.querySelector<HTMLElement>('[data-testid="invite-status-2"]')?.className,
  ).toContain("sky");
  expect(document.querySelector<HTMLElement>('[data-testid="invite-kind-1"]')?.className).toContain(
    "teal",
  );
  expect(document.querySelector<HTMLElement>('[data-testid="invite-kind-2"]')?.className).toContain(
    "violet",
  );
  expect(
    document.querySelector<HTMLElement>('[data-testid="invite-ephemeral-2"]')?.className,
  ).toContain("amber");
  expect(
    document.querySelector<HTMLElement>('[data-testid="invite-tag-1-0"]')?.className,
  ).toContain("cyan");
  inputDomTestId("invite-search", "alice");
  await expect.element(page.getByTestId("invite-1")).toBeVisible();
  expect(document.querySelector('[data-testid="invite-2"]')).toBeNull();
  inputDomTestId("invite-search", "");
  inputDomTestId("invite-search", "tag:server");
  await expect.element(page.getByTestId("invite-1")).toBeVisible();
  expect(document.querySelector('[data-testid="invite-2"]')).toBeNull();
  inputDomTestId("invite-search", "");
  selectDomTestId("invite-filter", "used");
  await expect.element(page.getByTestId("invite-2")).toBeVisible();
  expect(document.querySelector('[data-testid="invite-1"]')).toBeNull();
  selectDomTestId("invite-filter", "tagged");
  await expect.element(page.getByTestId("invite-1")).toBeVisible();
  expect(document.querySelector('[data-testid="invite-2"]')).toBeNull();

  selectDomTestId("invite-filter", "all");
  await page.getByTestId("open-create-invite").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  await page.getByTestId("invite-user").selectOptions("3");
  expect(document.querySelector<HTMLElement>('[data-testid="invite-expiration"]')?.tagName).toBe(
    "BUTTON",
  );
  expectAuthKeyDateTimePickerClosed();
  await page.viewport(500, 768);
  expectAuthKeyDateTimePickerClosed();
  await page.getByTestId("invite-expiration").click();
  await expect
    .poll(() => document.querySelectorAll<HTMLElement>('[data-slot="calendar"] select').length)
    .toBe(2);
  expectAuthKeyTimePickerPopover();
  await page.viewport(1366, 768);
  expectAuthKeyTimePickerPopover();
  const [monthSelect, yearSelect] = Array.from(
    document.querySelectorAll<HTMLSelectElement>('[data-slot="calendar"] select'),
  );
  monthSelect.value = "6";
  monthSelect.dispatchEvent(new Event("change", { bubbles: true }));
  yearSelect.value = "2026";
  yearSelect.dispatchEvent(new Event("change", { bubbles: true }));
  await expect
    .poll(() => document.querySelector<HTMLElement>('[data-slot="calendar"]')?.textContent)
    .toContain("2026");
  const juneFirst = Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="calendar-cell-trigger"]'),
  ).find(
    (element) => element.textContent?.trim() === "1" && element.getBoundingClientRect().width > 0,
  );
  expect(juneFirst).toBeTruthy();
  juneFirst?.click();
  selectDomTestId("invite-expiration-hour", "00");
  selectDomTestId("invite-expiration-minute", "00");
  await expect.element(page.getByTestId("invite-expiration")).toHaveTextContent("Jun 1, 2026");
  await expect.element(page.getByTestId("invite-expiration")).toHaveTextContent("12:00 AM");
  await page.getByTestId("invite-tags").fill("tag:mobile");
  await page.getByTestId("invite-reusable").click();
  await page.getByTestId("invite-ephemeral").click();
  await page.getByTestId("create-invite").click();
  await expect.element(page.getByTestId("created-invite")).toBeVisible();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "preauthkey.create"))
    .toBe(true);
  expect(
    window.__headscaleUiOperationCalls?.find((call) => call.id === "preauthkey.create")?.payload
      .expiration,
  ).toBe(new Date("2026-06-01T00:00").toISOString());

  await page.getByTestId("expire-invite-1").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "preauthkey.expire"))
    .toBe(true);
  await page.getByTestId("delete-invite-2").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "preauthkey.delete"))
    .toBe(true);
  expect(document.querySelector('[data-testid="invite-2"]')).toBeNull();
});

test("covers policy builder add, remove and save behavior without raw JSON editing", async () => {
  await renderLogin();
  await connectWithDefaults();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("section-access").click();
  await expect.element(page.getByTestId("policy-editor")).toBeVisible();
  await expect.element(page.getByTestId("policy-simple-source")).toBeVisible();
  await expect.element(page.getByTestId("policy-summary-warnings-count")).toBeVisible();
  await expect.element(page.getByTestId("policy-rule-builder")).toBeVisible();

  const clickOnlyRules = countByTestIdPrefix("policy-rule-");
  await page.getByTestId("policy-simple-source").selectOptions("alice@example.com");
  await page.getByTestId("policy-simple-destination").selectOptions("tag:server");
  await page.getByTestId("policy-simple-ports").selectOptions("22");
  await expect.element(page.getByTestId("policy-rule-preview")).toHaveTextContent("Alice");
  await expect.element(page.getByTestId("policy-rule-preview")).toHaveTextContent("tag:server");
  await expect.element(page.getByTestId("policy-rule-preview")).toHaveTextContent("SSH");
  clickDomTestId("add-policy-rule");
  await expect.poll(() => countByTestIdPrefix("policy-rule-")).toBe(clickOnlyRules + 1);

  await page.getByTestId("policy-tab-groups").click();
  await expect.element(page.getByTestId("policy-group-name")).toBeVisible();
  const initialGroups = countByTestIdPrefix("policy-group-");
  await page.getByTestId("policy-group-name").selectOptions("group:dev");
  await page.getByTestId("policy-group-member-select").selectOptions("alice@example.com");
  await page.getByTestId("add-policy-group-member").click();
  await page.getByTestId("add-policy-group").click();
  await expect.poll(() => countByTestIdPrefix("policy-group-")).toBe(initialGroups + 1);

  await page.getByTestId("policy-tab-tags").click();
  await expect.element(page.getByTestId("policy-tag-name")).toBeVisible();
  const initialTagOwners = countByTestIdPrefix("policy-tag-owner-");
  await page.getByTestId("policy-tag-name").selectOptions("tag:db");
  await page.getByTestId("policy-tag-owner-select").selectOptions("group:ops");
  await page.getByTestId("add-policy-tag-owner-selection").click();
  await page.getByTestId("add-policy-tag-owner").click();
  await expect.poll(() => countByTestIdPrefix("policy-tag-owner-")).toBe(initialTagOwners + 1);

  await page.getByTestId("policy-tab-rules").click();
  await expect.element(page.getByTestId("policy-rule-builder")).toBeVisible();
  await page.getByTestId("policy-simple-source").selectOptions("group:dev");
  await page.getByTestId("policy-simple-destination").selectOptions("tag:db");
  await page.getByTestId("policy-simple-ports").selectOptions("443");
  await expect.element(page.getByTestId("policy-rule-preview")).toHaveTextContent("group:dev");
  await expect.element(page.getByTestId("policy-rule-preview")).toHaveTextContent("tag:db");
  await expect.element(page.getByTestId("policy-rule-preview")).toHaveTextContent("HTTPS");

  const initialRules = countByTestIdPrefix("policy-rule-");
  clickDomTestId("add-policy-rule");
  await expect.poll(() => countByTestIdPrefix("policy-rule-")).toBe(initialRules + 1);

  expectNoRawPolicyEditor();
  await page.getByTestId("save-policy").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);

  const savedWithUiChanges = latestSavedPolicy();
  expect(savedWithUiChanges.acls).toContainEqual({
    action: "accept",
    src: ["alice@example.com"],
    dst: ["tag:server:22"],
  });
  expect(savedWithUiChanges.acls).toContainEqual({
    action: "accept",
    src: ["group:dev"],
    dst: ["tag:db:443"],
  });
  expect(savedWithUiChanges.groups?.["group:dev"]).toEqual(["alice@example.com"]);
  expect(savedWithUiChanges.tagOwners?.["tag:db"]).toEqual(["group:ops"]);
  expect(savedWithUiChanges.ssh).toBeTruthy();

  window.__headscaleUiOperationCalls = [];
  clickLastByTestIdPrefix("remove-policy-rule-");
  await expect.poll(() => countByTestIdPrefix("policy-rule-")).toBe(initialRules);
  await page.getByTestId("policy-tab-groups").click();
  await expect.element(page.getByTestId("policy-group-name")).toBeVisible();
  clickLastByTestIdPrefix("remove-policy-group-");
  await expect.poll(() => countByTestIdPrefix("policy-group-")).toBe(initialGroups);
  await page.getByTestId("policy-tab-tags").click();
  await expect.element(page.getByTestId("policy-tag-name")).toBeVisible();
  clickLastByTestIdPrefix("remove-policy-tag-owner-");
  await expect.poll(() => countByTestIdPrefix("policy-tag-owner-")).toBe(initialTagOwners);

  expectNoRawPolicyEditor();
  await page.getByTestId("save-policy").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);

  const savedAfterRemoval = latestSavedPolicy();
  expect(savedAfterRemoval.acls).not.toContainEqual({
    action: "accept",
    src: ["group:dev"],
    dst: ["tag:db:443"],
  });
  expect(savedAfterRemoval.groups?.["group:dev"]).toBeUndefined();
  expect(savedAfterRemoval.tagOwners?.["tag:db"]).toBeUndefined();
});

test("does not expose a settings page", async () => {
  await renderLogin();
  await connectWithDefaults();

  expect(document.querySelector('[data-testid="section-settings"]')).toBeNull();
  expect(document.querySelector('[data-testid^="settings-"]')).toBeNull();
  expect(document.querySelector('[data-testid="api-key-1"]')).toBeNull();
});

test("covers task navigation and the client-device setup branch", async () => {
  await renderLogin();
  await connectWithDefaults();

  expect(document.body.textContent).not.toContain("Quick actions");
  expect(document.querySelector('[data-testid="quick-invite"]')).toBeNull();
  expect(document.querySelector('[data-testid="quick-devices"]')).toBeNull();
  expect(document.querySelector('[data-testid="quick-routes"]')).toBeNull();

  await page.getByTestId("section-members").click();
  expect(document.querySelector('[data-testid="invite-users-task"]')).toBeNull();
  expect(document.querySelector('[data-testid="review-routes-task"]')).toBeNull();
  await openCreateMemberDialog();
  await page.getByTestId("cancel-create-member").click();
  await page.getByTestId("section-routes").click();
  await expect.element(page.getByTestId("route-node-2")).toBeVisible();
  await page.getByTestId("route-machine-link-2").click();
  await expect.element(page.getByTestId("device-search")).toHaveValue("edge-router");
  await expect.element(page.getByTestId("device-2")).toBeVisible();
  await page.getByTestId("section-routes").click();
  await page.getByTestId("route-user-link-2").click();
  await expect.element(page.getByTestId("user-search")).toHaveValue("Tagged Devices");
  await expect.element(page.getByTestId("member-tagged-devices")).toBeVisible();

  await page.getByTestId("section-devices").click();
  await page.getByTestId("add-device-toggle").click();
  await page.getByTestId("add-client-device").click();
  await expect.element(page.getByTestId("device-setup-flow")).toBeVisible();
  await expect.element(page.getByTestId("setup-tags")).toHaveValue("");
  await expect.element(page.getByTestId("setup-ephemeral")).toBeChecked();
  await expect.element(page.getByTestId("setup-reusable")).not.toBeChecked();
  clickDomTestId("setup-tags-enabled");
  await expect.element(page.getByTestId("setup-tags")).toHaveValue("tag:server");
  await page.getByTestId("setup-expiration-increment").click();
  await expect.element(page.getByTestId("setup-expiration")).toHaveValue("8");
  await page.getByTestId("setup-expiration-decrement").click();
  await expect.element(page.getByTestId("setup-expiration")).toHaveValue("7");
  await page.getByTestId("setup-manage-tags").click();
  await expect.element(page.getByTestId("policy-editor")).toBeVisible();
});

test("copies generated auth keys and install commands", async () => {
  await renderLogin();
  await connectWithDefaults();
  const clipboard = stubClipboard();

  try {
    await page.getByTestId("section-invites").click();
    await page.getByTestId("open-create-invite").click();
    await page.getByTestId("create-invite").click();
    await expect.element(page.getByTestId("created-invite")).toBeVisible();
    await page.getByTestId("copy-created-invite").click();
    await page.getByTestId("copy-created-install-command").click();

    await page.getByTestId("section-devices").click();
    await page.getByTestId("add-device-toggle").click();
    await page.getByTestId("add-linux-device").click();
    await page.getByTestId("generate-install-script").click();
    await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
    await page.getByTestId("create-invite").click();
    await expect.element(page.getByTestId("created-invite")).toHaveTextContent("tailscale up");
    await page.getByTestId("copy-setup-install-command").click();

    expect(clipboard.writes.some((value) => value.startsWith("preauthkey-demo-"))).toBe(true);
    expect(clipboard.writes.filter((value) => value.includes("tailscale up")).length).toBe(2);
  } finally {
    clipboard.restore();
  }
});

test("keeps every core function usable on mobile", async () => {
  await page.viewport(390, 844);
  await renderLogin();
  await expect.element(page.getByTestId("connect-form")).toBeVisible();
  expectNoHorizontalOverflow();

  await connectWithDefaults();
  await expect.element(page.getByTestId("profile-menu-trigger")).toBeVisible();
  expectAppHeader();
  expectResponsiveTabMenu();
  expectNoHorizontalOverflow();

  for (const section of ["devices", "members", "invites", "routes", "access"] as const) {
    await selectSectionTab(section);
    expectNoHorizontalOverflow();
  }

  await selectSectionTab("members");
  await openCreateMemberDialog();
  await page.getByTestId("member-name").fill("mobile");
  await page.getByTestId("create-member").click();
  await expect.element(page.getByTestId("member-mobile")).toBeVisible();
  expectNoHorizontalOverflow();

  await selectSectionTab("invites");
  await page.getByTestId("open-create-invite").click();
  await page.getByTestId("invite-tags").fill("tag:mobile");
  await page.getByTestId("invite-ephemeral").click();
  await page.getByTestId("create-invite").click();
  await expect.element(page.getByTestId("created-invite")).toBeVisible();
  expectNoHorizontalOverflow();

  await selectSectionTab("devices");
  expectMachinesWorkbench();
  await page.getByTestId("device-search").fill("alice");
  await page.getByTestId("machine-actions-trigger-mobile-1").click();
  await expect.element(page.getByTestId("machine-actions-menu-mobile-1")).toBeVisible();
  await page.getByTestId("rename-node-action-mobile-1").click();
  await expect.element(page.getByTestId("rename-node-dialog")).toBeVisible();
  await page.getByTestId("rename-node-dialog-input").fill("alice-phone");
  await page.getByTestId("rename-node-confirm").click();
  await expect.element(page.getByTestId("device-1")).toHaveTextContent("alice-phone");
  expectNoHorizontalOverflow();

  await selectSectionTab("routes");
  await page.getByTestId("approve-routes-2").click();
  await expect
    .poll(() =>
      window.__headscaleUiOperationCalls?.some((call) => call.id === "node.setApprovedRoutes"),
    )
    .toBe(true);
  await expect
    .poll(() => document.querySelectorAll('[data-testid^="pending-route-2-"]').length)
    .toBe(0);
  expect(document.querySelector('[data-testid="pending-routes-list-2"]')).toBeNull();
  await expect.element(page.getByTestId("route-approved-2-1")).toHaveTextContent("0.0.0.0/0");
  expectNoHorizontalOverflow();

  await selectSectionTab("access");
  await expect.element(page.getByTestId("policy-editor")).toBeVisible();
  await expect.element(page.getByTestId("policy-rule-builder")).toBeVisible();
  await page.getByTestId("save-policy").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);
  expectNoHorizontalOverflow();
});

test("defaults to English and supports the United Nations official languages", async () => {
  await renderLogin();
  await connectWithDefaults();

  await expect.element(page.getByTestId("section-devices")).toBeVisible();

  await chooseProfileMenuOption("locale-option-zh");
  await expect.element(page.getByTestId("section-devices")).toHaveTextContent("机器");

  for (const code of ["fr", "ru", "es", "ar"] as const) {
    await chooseProfileMenuOption(`locale-option-${code}`);
    expect(document.documentElement.lang).toBe(code);
  }

  await expect.element(page.getByTestId("section-devices")).toHaveTextContent("الأجهزة");
  expect(document.documentElement.dir).toBe("rtl");
});

test("mirrors the access policy workspace in Arabic", async () => {
  await renderLogin();
  await connectWithDefaults();

  await chooseProfileMenuOption("locale-option-ar");
  await selectSectionTab("access");
  await expect.element(page.getByTestId("policy-rule-builder")).toBeVisible();

  expect(document.documentElement.lang).toBe("ar");
  expect(document.documentElement.dir).toBe("rtl");

  const builder = document.querySelector<HTMLElement>('[data-testid="policy-rule-builder"]');
  const table = document.querySelector<HTMLElement>("table");
  expect(builder).toBeTruthy();
  expect(table).toBeTruthy();

  const builderRect = builder?.getBoundingClientRect();
  const tableRect = table?.getBoundingClientRect();
  expect(builderRect?.left).toBeGreaterThan(tableRect?.left ?? 0);
  expect(builderRect?.right).toBeGreaterThan(tableRect?.right ?? 0);

  const headings = Array.from(document.querySelectorAll<HTMLElement>("th"));
  expect(getComputedStyle(headings[0] as HTMLElement).textAlign).toMatch(/^(right|start)$/);
  expect(getComputedStyle(headings.at(-1) as HTMLElement).textAlign).toMatch(/^(left|end)$/);
  expectNoHorizontalOverflow();

  await page.viewport(390, 844);
  await expect.element(page.getByTestId("policy-rule-builder")).toBeVisible();
  expectNoHorizontalOverflow();
});

test("supports light, dark and system theme modes", async () => {
  await renderLogin();
  await connectWithDefaults();

  const seenThemes = new Set<string>();
  for (const mode of ["light", "dark", "auto"]) {
    await chooseProfileMenuOption(`theme-option-${mode}`);
    const theme = localStorage.getItem("headscale-ui-theme");
    if (theme) {
      seenThemes.add(theme);
    }
    if (mode === "dark") {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    }
  }

  expect(seenThemes).toEqual(new Set(["light", "dark", "auto"]));
});

test("uses a Tailscale-style add device setup flow", async () => {
  await renderLogin();
  await connectWithDefaults();

  await page.getByTestId("section-devices").click();
  expectMachinesWorkbench();
  await page.getByTestId("add-device-toggle").click();
  await page.getByTestId("add-linux-device").click();

  await expect.element(page.getByTestId("device-setup-flow")).toBeVisible();
  await expect.element(page.getByTestId("setup-device-step")).toBeVisible();
  await expect.element(page.getByTestId("setup-auth-key-step")).toBeVisible();
  await expect.element(page.getByTestId("setup-generate-step")).toBeVisible();
  await expect.element(page.getByTestId("setup-tags")).toHaveValue("tag:server");
  await expect.element(page.getByTestId("setup-reusable")).toBeChecked();

  await page.getByTestId("generate-install-script").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  await page.getByTestId("create-invite").click();
  await expect.element(page.getByTestId("created-invite")).toHaveTextContent("tailscale up");

  await page.getByTestId("back-to-machines").click();
  expectMachinesWorkbench();
});
