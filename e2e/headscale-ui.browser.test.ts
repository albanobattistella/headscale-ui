import { beforeEach, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "@/App.vue";
import { resetAllSingletons } from "@/composables/__testing";
import { useHeadscaleClient } from "@/composables/useHeadscaleClient";
import { masterPasswordTestingHandle, useMasterPassword } from "@/composables/useMasterPassword";
import { useSnapshot } from "@/composables/useSnapshot";
import { i18n } from "@/i18n";
import {
  idbGet,
  idbPut,
  __resetForTest as resetIdbCache,
  STORE_META,
  STORE_PROFILES,
} from "@/lib/idb";
import { hydrate, profileStorage, profileStorageTestingHandle } from "@/lib/profile-storage";
import { hydrateSettings, settingsStorageTestingHandle } from "@/lib/settings-storage";
import { installAuthGuard, routes } from "@/router";
import "@/styles/globals.css";

type StoredProfile = {
  id: string;
  name: string;
  baseUrl: string;
};

function storedProfiles(): StoredProfile[] {
  return profileStorage.loadProfiles().map((p) => ({
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
  }));
}

/**
 * Mirrors the legacy `storedProfilesString()` assertion shape so existing
 * `.toContain("Office")` checks keep working after the IDB migration. Returns a JSON-serialised
 * blob of profile names + baseUrls drawn from the live profileStorage cache, plus a sentinel
 * for the "no profiles saved" case.
 */
function storedProfilesString(): string | null {
  const profiles = profileStorage.loadProfiles();
  if (profiles.length === 0) return null;
  return JSON.stringify(
    profiles.map((p) => ({ id: p.id, name: p.name, baseUrl: p.baseUrl, scope: p.scope })),
  );
}

function storedActiveProfileId(): string | null {
  return profileStorage.readActiveProfile();
}

async function readIdbSetting(key: string): Promise<string | null> {
  const raw = await idbGet<Record<string, string>>(STORE_META, "ui-settings");
  return raw && typeof raw === "object" && typeof raw[key] === "string" ? raw[key] : null;
}

async function clearHeadscaleDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("headscale-ui");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  await page.viewport(1366, 768);
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
  // Order matters: drop the live db connection first or deleteDatabase blocks.
  resetIdbCache();
  profileStorageTestingHandle.reset();
  masterPasswordTestingHandle.reset();
  settingsStorageTestingHandle.reset();
  await clearHeadscaleDb();
  (i18n.global.locale as unknown as { value: string }).value = "en";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  window.__headscaleUiOperationCalls = [];
  resetAllSingletons();
});

/**
 * Seed an encrypted profile row directly into IDB so renderLogin's hydrate
 * sees a pre-existing saved profile. Replaces the old localStorage seed path.
 */
async function seedProfileInIdb(
  plain: {
    id: string;
    name: string;
    mode: "mock" | "real";
    baseUrl: string;
    apiKey: string;
    updatedAt: string;
  },
  opts: { active?: boolean } = {},
): Promise<void> {
  const mp = useMasterPassword();
  await mp.initialize();
  const apiKey = await mp.encryptWithDeviceKey(plain.apiKey);
  await idbPut(STORE_PROFILES, {
    id: plain.id,
    name: plain.name,
    mode: plain.mode,
    baseUrl: plain.baseUrl,
    apiKey,
    updatedAt: plain.updatedAt,
    scope: "persistent",
  });
  if (opts.active) {
    await idbPut(STORE_META, plain.id, "active-profile-id");
  }
  // Drop singletons so renderLogin reinitialises and re-reads IDB from a clean state.
  masterPasswordTestingHandle.reset();
  profileStorageTestingHandle.reset();
  resetIdbCache();
}

async function renderLogin(path = "/") {
  await hydrateSettings();
  const mp = useMasterPassword();
  await mp.initialize();
  await hydrate({
    encryptLegacy: (plain) => mp.encryptWithDeviceKey(plain),
  });
  window.history.pushState({}, "", path);
  const testRouter = createRouter({
    history: createWebHistory(),
    routes,
  });
  installAuthGuard(testRouter);
  const rendered = await render(App, {
    global: {
      plugins: [i18n, testRouter],
    },
  });
  await testRouter.isReady();
  return rendered;
}

async function connectWithDefaults() {
  const form = document.querySelector<HTMLElement>('[data-testid="connect-form"]');
  const defaultProfile = document.querySelector<HTMLElement>(
    '[data-testid="profile-option-Local mock"]',
  );
  if (!defaultProfile && (!form || form.getBoundingClientRect().width === 0)) {
    await page.getByTestId("profile-option-new").click();
  }
  if (!defaultProfile) {
    await expect.element(page.getByTestId("connect-form")).toBeVisible();
    await page.getByTestId("connect-submit").click();
    await expect.element(page.getByTestId("profile-option-Local mock")).toBeVisible();
  }
  await page.getByTestId("profile-option-Local mock").click();
  await expect.element(page.getByTestId("profile-menu-trigger")).toBeVisible();
}

async function openCreateMemberDialog() {
  await page.getByTestId("open-create-member").click();
  await expect.element(page.getByTestId("member-create-dialog")).toBeVisible();
}

function expectNoHorizontalOverflow() {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
}

function expectDialogFitsViewport(testId: string) {
  const dialog = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(dialog).toBeTruthy();
  const rect = (dialog as HTMLElement).getBoundingClientRect();
  expect(rect.top).toBeGreaterThanOrEqual(0);
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.height).toBeLessThanOrEqual(window.innerHeight);
  expect(rect.width).toBeLessThanOrEqual(window.innerWidth);
}

function expectDialogUsableInViewport(testId: string) {
  const dialog = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(dialog).toBeTruthy();
  expectDialogFitsViewport(testId);
  const overflowX = getComputedStyle(dialog as HTMLElement).overflowX;
  if ((dialog as HTMLElement).scrollWidth > (dialog as HTMLElement).clientWidth + 1) {
    expect(overflowX).toMatch(/^(clip|hidden)$/);
  }

  const overflowY = getComputedStyle(dialog as HTMLElement).overflowY;
  if ((dialog as HTMLElement).scrollHeight > (dialog as HTMLElement).clientHeight + 1) {
    expect(overflowY).toMatch(/^(auto|scroll)$/);
  }

  const close = (dialog as HTMLElement).querySelector<HTMLElement>('[data-slot="dialog-close"]');
  if (close) {
    const closeRect = close.getBoundingClientRect();
    expect(closeRect.top).toBeGreaterThanOrEqual(0);
    expect(closeRect.right).toBeLessThanOrEqual(window.innerWidth);
  }
}

function expectLayerFitsViewport(selector: string) {
  const layer = document.querySelector<HTMLElement>(selector);
  expect(layer).toBeTruthy();
  const rect = (layer as HTMLElement).getBoundingClientRect();
  expect(rect.top).toBeGreaterThanOrEqual(0);
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.height).toBeLessThanOrEqual(window.innerHeight);
  expect(rect.width).toBeLessThanOrEqual(window.innerWidth);
}

function expectTestIdFitsViewport(testId: string) {
  const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(element).toBeTruthy();
  const rect = (element as HTMLElement).getBoundingClientRect();
  expect(rect.top).toBeGreaterThanOrEqual(0);
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
  expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
}

function expectTestIdAboveTestId(testId: string, boundaryTestId: string) {
  const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const boundary = document.querySelector<HTMLElement>(`[data-testid="${boundaryTestId}"]`);
  expect(element).toBeTruthy();
  expect(boundary).toBeTruthy();
  const rect = (element as HTMLElement).getBoundingClientRect();
  const boundaryRect = (boundary as HTMLElement).getBoundingClientRect();
  expect(rect.bottom).toBeLessThanOrEqual(boundaryRect.top);
}

function expectOverviewStatsCompactGrid() {
  const stats = document.querySelector<HTMLElement>('[data-testid="overview-stats"]');
  expect(stats).toBeTruthy();
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>('[data-testid^="overview-stat-"]'),
  );
  expect(cards).toHaveLength(5);

  const statsRect = (stats as HTMLElement).getBoundingClientRect();
  const firstRect = cards[0]?.getBoundingClientRect();
  const secondRect = cards[1]?.getBoundingClientRect();
  expect(firstRect).toBeTruthy();
  expect(secondRect).toBeTruthy();
  expect(Math.abs((firstRect as DOMRect).top - (secondRect as DOMRect).top)).toBeLessThan(2);
  expect((secondRect as DOMRect).left).toBeGreaterThan((firstRect as DOMRect).left);
  expect(statsRect.height).toBeLessThanOrEqual(170);

  const recentHeading = document.querySelector<HTMLElement>(
    '[data-testid="recent-devices-heading"]',
  );
  expect(recentHeading).toBeTruthy();
  expect((recentHeading as HTMLElement).getBoundingClientRect().top).toBeLessThan(
    window.innerHeight,
  );
}

async function captureResponsiveScreenshot(name: string) {
  await page.screenshot({
    path: `__screenshots__/responsive-review/${name}.png`,
  });
}

function expectConnectionFormGridLayout() {
  const profileName = document.querySelector<HTMLElement>('[data-testid="connect-profile-name"]');
  const mode = document.querySelector<HTMLElement>('[data-testid="connect-mode"]');
  const serverUrl = document.querySelector<HTMLElement>('[data-testid="connect-server-url"]');
  const apiKey = document.querySelector<HTMLElement>('[data-testid="connect-api-key"]');
  expect(profileName).toBeTruthy();
  expect(mode).toBeTruthy();
  expect(serverUrl).toBeTruthy();
  expect(apiKey).toBeTruthy();
  const modeWrapper = (mode as HTMLElement).closest<HTMLElement>(
    '[data-slot="native-select-wrapper"]',
  );
  expect(modeWrapper).toBeTruthy();

  const profileNameRect = (profileName as HTMLElement).getBoundingClientRect();
  const modeRect = (mode as HTMLElement).getBoundingClientRect();
  const modeWrapperRect = (modeWrapper as HTMLElement).getBoundingClientRect();
  const serverUrlRect = (serverUrl as HTMLElement).getBoundingClientRect();
  const apiKeyRect = (apiKey as HTMLElement).getBoundingClientRect();
  expect(Math.abs(profileNameRect.top - modeRect.top)).toBeLessThan(2);
  expect(Math.abs(modeWrapperRect.width - profileNameRect.width)).toBeLessThan(2);
  expect(Math.abs(serverUrlRect.left - profileNameRect.left)).toBeLessThan(2);
  expect(Math.abs(apiKeyRect.left - profileNameRect.left)).toBeLessThan(2);
  expect(serverUrlRect.width).toBeGreaterThan(profileNameRect.width * 1.8);
  expect(apiKeyRect.width).toBeGreaterThan(modeRect.width * 1.8);
}

function expectDialogHasNoInternalScrollbar(testId: string) {
  const dialog = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(dialog).toBeTruthy();
  expect((dialog as HTMLElement).scrollHeight).toBeLessThanOrEqual(
    (dialog as HTMLElement).clientHeight + 1,
  );
}

function expectTextAlignsToStart(element: HTMLElement) {
  expect(getComputedStyle(element).textAlign).toMatch(
    document.documentElement.dir === "rtl" ? /^(right|start)$/ : /^(left|start)$/,
  );
}

function expectPointerCursor(testId: string) {
  const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(element).toBeTruthy();
  expect(getComputedStyle(element as HTMLElement).cursor).toBe("pointer");
}

function preventNextClickDefault(testId: string) {
  document
    .querySelector<HTMLElement>(`[data-testid="${testId}"]`)
    ?.addEventListener("click", (event) => event.preventDefault(), { once: true });
}

const interactiveCursorSelectors = [
  "a[href]",
  "button:not(:disabled):not([aria-disabled='true'])",
  "select:not(:disabled)",
  "input[type='button']:not(:disabled)",
  "input[type='checkbox']:not(:disabled)",
  "input[type='color']:not(:disabled)",
  "input[type='date']:not(:disabled)",
  "input[type='datetime-local']:not(:disabled)",
  "input[type='file']:not(:disabled)",
  "input[type='month']:not(:disabled)",
  "input[type='radio']:not(:disabled)",
  "input[type='reset']:not(:disabled)",
  "input[type='submit']:not(:disabled)",
  "input[type='time']:not(:disabled)",
  "input[type='week']:not(:disabled)",
  "label[for]",
  "summary",
  "[role='button']:not([aria-disabled='true'])",
  "[role='checkbox']:not([aria-disabled='true'])",
  "[role='menuitem']:not([data-disabled])",
  "[role='menuitemcheckbox']:not([data-disabled])",
  "[role='menuitemradio']:not([data-disabled])",
  "[role='option']:not([aria-disabled='true'])",
  "[role='radio']:not([aria-disabled='true'])",
  "[role='switch']:not([aria-disabled='true'])",
  "[role='tab']:not([disabled])",
];

function isVisibleCursorTarget(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return (
    rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden"
  );
}

function describeCursorTarget(element: HTMLElement) {
  return [
    element.tagName.toLowerCase(),
    element.dataset.testid ? `[data-testid="${element.dataset.testid}"]` : "",
    element.getAttribute("role") ? `[role="${element.getAttribute("role")}"]` : "",
    element.id ? `#${element.id}` : "",
  ].join("");
}

function expectVisibleInteractiveElementsUsePointer() {
  const offenders = Array.from(
    document.querySelectorAll<HTMLElement>(interactiveCursorSelectors.join(",")),
  )
    .filter(isVisibleCursorTarget)
    .filter((element) => getComputedStyle(element).pointerEvents !== "none")
    .filter((element) => getComputedStyle(element).cursor !== "pointer")
    .map((element) => `${describeCursorTarget(element)} -> ${getComputedStyle(element).cursor}`);

  expect(offenders).toEqual([]);
}

function expectDialogMirrorsInlineEnd(testId: string) {
  const dialog = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const close = dialog?.querySelector<HTMLElement>('[data-slot="dialog-close"]');
  const header = dialog?.querySelector<HTMLElement>('[data-slot="dialog-header"]');
  expect(dialog).toBeTruthy();
  expect(close).toBeTruthy();
  expect(header).toBeTruthy();
  expectTextAlignsToStart(header as HTMLElement);

  const dialogRect = (dialog as HTMLElement).getBoundingClientRect();
  const closeRect = (close as HTMLElement).getBoundingClientRect();
  const distanceToLeft = Math.abs(closeRect.left - dialogRect.left);
  const distanceToRight = Math.abs(dialogRect.right - closeRect.right);
  if (document.documentElement.dir === "rtl") {
    expect(distanceToLeft).toBeLessThan(distanceToRight);
  } else {
    expect(distanceToRight).toBeLessThan(distanceToLeft);
  }
}

function expectNativeSelectIconMirrorsInlineEnd(testId: string) {
  const select = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const wrapper = select?.closest<HTMLElement>('[data-slot="native-select-wrapper"]');
  const icon = wrapper?.querySelector<HTMLElement>('[data-slot="native-select-icon"]');
  expect(wrapper).toBeTruthy();
  expect(icon).toBeTruthy();

  const wrapperRect = (wrapper as HTMLElement).getBoundingClientRect();
  const iconRect = (icon as HTMLElement).getBoundingClientRect();
  const distanceToLeft = Math.abs(iconRect.left - wrapperRect.left);
  const distanceToRight = Math.abs(wrapperRect.right - iconRect.right);
  if (document.documentElement.dir === "rtl") {
    expect(distanceToLeft).toBeLessThan(distanceToRight);
  } else {
    expect(distanceToRight).toBeLessThan(distanceToLeft);
  }
}

function expectSwitchThumbMirrorsCurrentState(testId: string) {
  const switchRoot = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const thumb = switchRoot?.querySelector<HTMLElement>('[data-slot="switch-thumb"]');
  expect(switchRoot).toBeTruthy();
  expect(thumb).toBeTruthy();

  const rootRect = (switchRoot as HTMLElement).getBoundingClientRect();
  const thumbRect = (thumb as HTMLElement).getBoundingClientRect();
  const thumbCenter = thumbRect.left + thumbRect.width / 2;
  const rootCenter = rootRect.left + rootRect.width / 2;
  const checked = (switchRoot as HTMLElement).dataset.state === "checked";
  if (document.documentElement.dir === "rtl" && checked) {
    expect(thumbCenter).toBeLessThan(rootCenter);
  } else if (document.documentElement.dir === "rtl") {
    expect(thumbCenter).toBeGreaterThan(rootCenter);
  } else if (checked) {
    expect(thumbCenter).toBeGreaterThan(rootCenter);
  } else {
    expect(thumbCenter).toBeLessThan(rootCenter);
  }
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
  const calendar = document.querySelector<HTMLElement>('[data-slot="calendar"]');
  const popover = document.querySelector<HTMLElement>('[data-slot="popover-content"]');
  expect(timePicker).toBeTruthy();
  expect(calendar).toBeTruthy();
  expect(popover).toBeTruthy();
  expectNoHorizontalOverflow();

  const orderedSlots = Array.from(
    (popover as HTMLElement).querySelectorAll<HTMLElement>(
      '[data-slot="calendar"], [data-slot="time-picker"]',
    ),
  ).map((element) => element.dataset.slot);
  expect(orderedSlots).toEqual(["calendar", "time-picker"]);
  const popoverRect = (popover as HTMLElement).getBoundingClientRect();
  const timeRect = (timePicker as HTMLElement).getBoundingClientRect();
  expect(timeRect.bottom).toBeLessThanOrEqual(popoverRect.bottom + 1);
  expect(
    document.querySelector<HTMLElement>('[data-testid="invite-expiration-time-label"]'),
  ).toBeTruthy();
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
  const githubLink = document.querySelector<HTMLElement>('[data-testid="github-repository-link"]');
  const profileTrigger = document.querySelector<HTMLElement>(
    '[data-testid="profile-menu-trigger"]',
  );
  expect(githubLink).toBeTruthy();
  expect(profileTrigger).toBeTruthy();
  expect(githubLink?.getAttribute("href")).toBe("https://github.com/MunMunMiao/headscale-ui");
  expect(githubLink?.compareDocumentPosition(profileTrigger as HTMLElement)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  expect(document.querySelector<HTMLElement>('[data-testid="current-server"]')).toBeNull();
  expect(navigation?.getAttribute("dir")).toBe(document.documentElement.dir);

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

async function expectMachinesWorkbench() {
  await expect.element(page.getByTestId("machines-workbench")).toBeVisible();
  await expect.element(page.getByTestId("device-1")).toBeVisible();
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
  const deviceIpBadges = document.querySelectorAll<HTMLElement>('[data-testid^="device-ip-1-"]');
  expect(deviceIpBadges).toHaveLength(2);
  expect(deviceIpBadges[0]?.textContent).toContain("100.64.0.1");
  expect(deviceIpBadges[0]?.className).toContain("font-mono");
  const deviceTag = document.querySelector<HTMLElement>('[data-testid="device-tag-1-0"]');
  const deviceStatus = document.querySelector<HTMLElement>('[data-testid="device-status-1"]');
  const offlineStatus = document.querySelector<HTMLElement>('[data-testid="device-status-2"]');
  const expiredStatus = document.querySelector<HTMLElement>('[data-testid="device-status-3"]');
  expect(deviceTag).toBeTruthy();
  expect(deviceStatus).toBeTruthy();
  expect(offlineStatus).toBeTruthy();
  expect(expiredStatus).toBeTruthy();
  expect(deviceTag?.className).toContain("bg-fuchsia-50");
  expect(deviceTag?.className).not.toBe(deviceStatus?.className);
  expect(deviceStatus?.textContent).toContain("Online");
  expect(deviceStatus?.className).toContain("emerald");
  expect(offlineStatus?.textContent).toContain("Offline");
  expect(offlineStatus?.className).toContain("slate");
  expect(expiredStatus?.textContent).toContain("Expired");
  expect(expiredStatus?.className).toContain("rose");
  expect(deviceStatus?.className).not.toBe(offlineStatus?.className);
  expect(deviceStatus?.className).not.toBe(expiredStatus?.className);
  expect(offlineStatus?.className).not.toBe(expiredStatus?.className);
  expect(document.querySelector('[data-testid="device-tag-3-0"]')).toBeNull();
  expect(document.querySelector('[data-testid="device-pending-routes-1"]')).toBeNull();
  const pendingRouteBadges = document.querySelectorAll<HTMLElement>(
    '[data-testid^="device-pending-route-2-"]',
  );
  const approvedRouteBadge = document.querySelector<HTMLElement>(
    '[data-testid="device-approved-route-2-0"]',
  );
  expect(pendingRouteBadges).toHaveLength(2);
  expect(pendingRouteBadges[0]?.textContent).toContain("0.0.0.0/0");
  expect(pendingRouteBadges[0]?.className).toContain("rose");
  expect(approvedRouteBadge?.textContent).toContain("10.42.0.0/16");
  expect(approvedRouteBadge?.className).toContain("emerald");
  expect(pendingRouteBadges[0]?.className).not.toBe(approvedRouteBadge?.className);
  const deviceTableText = document.querySelector('[data-testid="machine-list"]')?.textContent ?? "";
  expect(deviceTableText).not.toMatch(/No tags|无标签|No pending routes|无待审路由/);
}

function expectRecentDeviceStatusColors() {
  const recentOnline = document.querySelector<HTMLElement>(
    '[data-testid="recent-device-status-1"]',
  );
  const recentOffline = document.querySelector<HTMLElement>(
    '[data-testid="recent-device-status-2"]',
  );
  const recentExpired = document.querySelector<HTMLElement>(
    '[data-testid="recent-device-status-3"]',
  );
  expect(recentOnline?.textContent).toContain("Online");
  expect(recentOnline?.className).toContain("emerald");
  expect(recentOffline?.textContent).toContain("Offline");
  expect(recentOffline?.className).toContain("slate");
  expect(recentExpired?.textContent).toContain("Expired");
  expect(recentExpired?.className).toContain("rose");
}

function operationCount(id: string) {
  return window.__headscaleUiOperationCalls?.filter((call) => call.id === id).length ?? 0;
}

function lastElementByTestIdPrefix(prefix: string) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(`[data-testid^="${prefix}"]`));
  const element = elements.at(-1);
  expect(element).toBeTruthy();
  return element as HTMLElement;
}

function clickLastByTestIdPrefix(prefix: string) {
  lastElementByTestIdPrefix(prefix).click();
}

async function expectPolicyRemovalDialog() {
  await expect.element(page.getByTestId("remove-policy-item-dialog")).toBeVisible();
  const confirm = document.querySelector<HTMLElement>('[data-testid="confirm-remove-policy-item"]');
  expect(confirm?.className).toContain("bg-destructive");
}

async function expectPolicyRemovalDialogClosed() {
  await expect
    .poll(() => document.querySelector('[data-testid="remove-policy-item-dialog"]'))
    .toBeNull();
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
  const labels = document.querySelector<HTMLElement>('[data-testid="device-labels-section"]');
  const teams = document.querySelector<HTMLElement>('[data-testid="teams-section"]');
  expect(labels ?? teams).toBeTruthy();
  for (const root of [labels, teams]) {
    expect(root?.querySelector("textarea")).toBeNull();
    expect(root?.querySelector('[contenteditable="true"]')).toBeNull();
    expect(root?.querySelector(".cm-editor, .monaco-editor")).toBeNull();
  }
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

async function closeLayerWithEscape(testId: string) {
  const layer = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const closeButton = layer?.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');
  if (closeButton) {
    closeButton.click();
  } else {
    await userEvent.keyboard("{Escape}");
  }
  await expect.poll(() => document.querySelector(`[data-testid="${testId}"]`)).toBeNull();
}

async function clickDialogOverlay() {
  const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
  expect(overlay).toBeTruthy();
  for (const event of [
    new PointerEvent("pointerdown", { bubbles: true, composed: true, pointerId: 1 }),
    new PointerEvent("pointerup", { bubbles: true, composed: true, pointerId: 1 }),
    new MouseEvent("click", { bubbles: true, composed: true }),
  ]) {
    overlay?.dispatchEvent(event);
  }
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function chooseProfileMenuOption(testId: string) {
  await openProfileMenu();
  if (testId.startsWith("locale-option-")) {
    clickDomTestId("language-menu-trigger");
  }
  if (testId.startsWith("theme-option-")) {
    clickDomTestId("theme-menu-trigger");
  }
  await expect.element(page.getByTestId(testId)).toBeVisible();
  clickDomTestId(testId);
  await closeProfileMenu();
}

async function selectSectionTab(section: string) {
  await page.getByTestId(`section-${section}`).click();
  await expect
    .poll(() => window.location.pathname.endsWith(`/${section}`), { timeout: 2000 })
    .toBe(true);
}

async function confirmDeleteProfile(name: string) {
  await page.getByTestId(`delete-profile-${name}`).click();
  await expect.element(page.getByTestId("delete-profile-dialog")).toBeVisible();
  await page.getByTestId("confirm-delete-profile").click();
}

test("manages multiple saved connection profiles and supports logout", async () => {
  const rendered = await renderLogin();

  await page.getByTestId("profile-option-new").click();
  await expect.element(page.getByTestId("connect-form")).toBeVisible();
  await page.getByTestId("connect-profile-name").fill("Office");
  await page.getByTestId("connect-api-key").fill("office-api-key");
  await page.getByTestId("connect-remember").click();
  await page.getByTestId("connect-remember").click();
  await page.getByTestId("connect-submit").click();
  expect(storedProfilesString()).toContain("Office");
  const officeProfile = storedProfiles().find((profile) => profile.name === "Office");
  expect(officeProfile?.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
  await expect.element(page.getByTestId("profile-row-Office")).toBeVisible();
  await page.getByTestId("edit-profile-Office").click();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();
  await expect.element(page.getByTestId("connect-profile-name")).toHaveValue("Office");
  await page.getByTestId("connect-profile-name").fill("HQ");
  await page.getByTestId("connect-submit").click();
  expect(storedProfilesString()).toContain("HQ");
  expect(storedProfilesString()).not.toContain("Office");
  const hqProfile = storedProfiles().find((profile) => profile.name === "HQ");
  expect(hqProfile).toBeTruthy();
  await expect.element(page.getByTestId("profile-row-HQ")).toBeVisible();

  await page.getByTestId("profile-option-new").click();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();
  await page.getByTestId("connect-profile-name").fill("Lab");
  await page.getByTestId("connect-api-key").fill("lab-api-key");
  await page.getByTestId("connect-submit").click();
  expect(storedProfilesString()).toContain("HQ");
  expect(storedProfilesString()).toContain("Lab");
  const labProfile = storedProfiles().find((profile) => profile.name === "Lab");
  expect(labProfile).toBeTruthy();

  await page.getByTestId("profile-option-HQ").click();
  await expect.element(page.getByTestId("section-home")).toBeVisible();
  expectRecentDeviceStatusColors();
  await openProfileMenu();
  await expect.element(page.getByTestId("profile-menu")).toHaveTextContent("HQ");
  expect(document.querySelector('[data-testid="current-server"]')).toBeNull();
  await closeProfileMenu();
  await expect.poll(() => window.location.pathname).toBe("/home");
  await expect.element(page.getByTestId("section-devices")).toBeVisible();
  await page.getByTestId("section-devices").click();
  await expect.poll(() => window.location.pathname).toBe("/devices");
  await expectMachinesWorkbench();

  const profileRoute = window.location.pathname;
  await rendered.unmount();
  await renderLogin(profileRoute);
  await expect.element(page.getByTestId("section-devices")).toBeVisible();
  await openProfileMenu();
  await expect.element(page.getByTestId("profile-menu")).toHaveTextContent("HQ");
  await closeProfileMenu();

  expect(document.querySelector("#server-url")).toBeNull();
  expect(document.querySelector("#api-key")).toBeNull();
  expect(storedActiveProfileId()).toBeTruthy();

  await page.getByTestId("profile-menu-trigger").click();
  await openProfileMenu();
  await page.getByTestId("logout").click();
  await expect.element(page.getByTestId("profile-picker")).toBeVisible();
  window.__headscaleUiOperationCalls = [];
  await new Promise((resolve) => window.setTimeout(resolve, 5200));
  expect(window.__headscaleUiOperationCalls).toEqual([]);
  expect(window.location.pathname).toBe("/login");
  expect(storedActiveProfileId()).toBeNull();
  expect(storedProfilesString()).toContain("HQ");

  await page.getByTestId("delete-profile-HQ").click();
  await expect.element(page.getByTestId("delete-profile-dialog")).toBeVisible();
  await expect.element(page.getByTestId("delete-profile-dialog")).toHaveTextContent("HQ");
  await page.getByTestId("cancel-delete-profile").click();
  expect(storedProfilesString()).toContain("HQ");
  await confirmDeleteProfile("HQ");
  expect(storedProfilesString()).not.toContain("HQ");
  expect(storedProfilesString()).toContain("Lab");
  await confirmDeleteProfile("Lab");
  expect(storedProfilesString()).toBeNull();
});

test("does not flash the login form while restoring a profile route", async () => {
  await seedProfileInIdb(
    {
      id: "profile-office",
      name: "Office",
      mode: "mock",
      baseUrl: "http://127.0.0.1:8080",
      apiKey: "office-api-key",
      updatedAt: "2026-05-04T00:00:00.000Z",
    },
    { active: true },
  );

  await renderLogin("/devices");

  expect(document.querySelector('[data-testid="connect-form"]')).toBeNull();
  await expect.element(page.getByTestId("section-devices")).toBeVisible();
  await expectMachinesWorkbench();
  expect(window.location.pathname).toBe("/devices");
});

test("redirects unknown profile routes back to login", async () => {
  await seedProfileInIdb(
    {
      id: "profile-office",
      name: "Office",
      mode: "mock",
      baseUrl: "http://127.0.0.1:8080",
      apiKey: "office-api-key",
      updatedAt: "2026-05-04T00:00:00.000Z",
    },
    { active: true },
  );

  await renderLogin("/00000000-0000-4000-8000-000000000000/devices");

  await expect.element(page.getByTestId("profile-picker")).toBeVisible();
  await expect.poll(() => window.location.pathname).toBe("/login");
  expect(document.querySelector('[data-testid="section-devices"]')).toBeNull();
  expect(storedActiveProfileId()).toBeNull();
});

test("validates saved profile credentials before restoring a route", async () => {
  await seedProfileInIdb(
    {
      id: "profile-offline",
      name: "Offline",
      mode: "real",
      baseUrl: "ftp://127.0.0.1",
      apiKey: "offline-api-key",
      updatedAt: "2026-05-04T00:00:00.000Z",
    },
    { active: true },
  );

  await renderLogin("/devices");

  await expect.element(page.getByTestId("profile-picker")).toBeVisible();
  await expect.poll(() => window.location.pathname).toBe("/login");
  await expect.element(page.getByTestId("login-error")).toBeVisible();
  expect(document.querySelector('[data-testid="section-devices"]')).toBeNull();
  expect(storedActiveProfileId()).toBeNull();
});

test("normalizes stale mock profiles with remote URLs into real profiles", async () => {
  await seedProfileInIdb({
    id: "profile-office",
    name: "Office",
    mode: "mock",
    baseUrl: "http://office.example.test",
    apiKey: "office-api-key",
    updatedAt: "2026-05-04T00:00:00.000Z",
  });

  await renderLogin();

  await page.getByTestId("edit-profile-Office").click();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();
  await expect.element(page.getByTestId("connect-mode")).toHaveValue("real");
  await expect
    .element(page.getByTestId("connect-server-url"))
    .toHaveValue("http://office.example.test");
});

test("asks before saving an unreachable profile and validates it before login", async () => {
  await renderLogin();

  await page.getByTestId("profile-option-new").click();
  await page.getByTestId("connect-mode").selectOptions("real");
  await page.getByTestId("connect-profile-name").fill("Offline");
  await page.getByTestId("connect-server-url").fill("ftp://127.0.0.1");
  await page.getByTestId("connect-api-key").fill("offline-api-key");
  await page.getByTestId("connect-submit").click();

  await expect.element(page.getByTestId("profile-validation-dialog")).toBeVisible();
  await expect.element(page.getByTestId("profile-validation-error")).toBeVisible();
  await page.getByTestId("review-profile-connection").click();
  await expect.element(page.getByTestId("connect-form")).toBeVisible();
  await expect.element(page.getByTestId("connect-error")).toBeVisible();
  expect(document.querySelector('[data-testid="section-home"]')).toBeNull();
  expect(storedActiveProfileId()).toBeNull();

  await page.getByTestId("connect-submit").click();
  await expect.element(page.getByTestId("profile-validation-dialog")).toBeVisible();
  await page.getByTestId("continue-add-profile").click();
  await expect.element(page.getByTestId("profile-row-Offline")).toBeVisible();
  expect(storedProfilesString()).toContain("Offline");
  expect(storedActiveProfileId()).toBeNull();

  clickDomTestId("profile-option-Offline");
  await expect.element(page.getByTestId("profile-loading-Offline")).toBeVisible();
  await expect.element(page.getByTestId("login-error")).toBeVisible();
  expect(document.querySelector('[data-testid="section-home"]')).toBeNull();
  expect(window.location.pathname).toBe("/login");
});

test("stores non-remembered profiles in session storage", async () => {
  await renderLogin();

  await page.getByTestId("profile-option-new").click();
  await page.getByTestId("connect-profile-name").fill("Temporary");
  await page.getByTestId("connect-api-key").fill("temporary-api-key");
  await page.getByTestId("connect-remember").click();
  await page.getByTestId("connect-submit").click();

  // Session-scope profiles now live in IndexedDB tagged with ownerTabId — never in plaintext
  // localStorage/sessionStorage. The "session" semantic comes from hydrate-time tab-id cleanup.
  expect(storedProfilesString()).toContain("Temporary");
  const sessionProfile = storedProfiles().find((p) => p.name === "Temporary");
  expect(sessionProfile).toBeDefined();
  expect(profileStorage.getProfileScope(sessionProfile?.id ?? "")).toBe("session");
  expect(storedActiveProfileId()).toBeNull();
  await expect.element(page.getByTestId("profile-row-Temporary")).toBeVisible();
});

test("refreshes data on every section change and repeated dialog open", async () => {
  await renderLogin();
  await connectWithDefaults();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("section-devices").click();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(0);
  const afterDevices = operationCount("node.list");
  await page.getByTestId("refresh-machines").click();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterDevices);
  const afterMachineRefresh = operationCount("node.list");

  await page.getByTestId("section-members").click();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterMachineRefresh);
  const afterMembers = operationCount("node.list");
  await page.getByTestId("refresh-users").click();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterMembers);
  const afterUserRefresh = operationCount("node.list");

  await page.getByTestId("member-detail-link-alice").click();
  await expect.element(page.getByTestId("user-detail-dialog")).toBeVisible();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterUserRefresh);
  const afterFirstUserDialog = operationCount("node.list");
  await closeLayerWithEscape("user-detail-dialog");

  await page.getByTestId("member-detail-link-alice").click();
  await expect.element(page.getByTestId("user-detail-dialog")).toBeVisible();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterFirstUserDialog);
  const afterSecondUserDialog = operationCount("node.list");
  await closeLayerWithEscape("user-detail-dialog");

  await page.getByTestId("section-invites").click();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterSecondUserDialog);
  const afterInvites = operationCount("node.list");
  await page.getByTestId("refresh-auth-keys").click();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterInvites);
  const afterInviteRefresh = operationCount("node.list");

  await page.getByTestId("open-create-invite").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterInviteRefresh);
  const afterFirstInviteDialog = operationCount("node.list");
  await page.getByTestId("cancel-create-invite").click();

  await page.getByTestId("open-create-invite").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterFirstInviteDialog);
  const afterSecondInviteDialog = operationCount("node.list");
  await page.getByTestId("cancel-create-invite").click();

  await page.getByTestId("section-routes").click();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterSecondInviteDialog);
  const afterRoutes = operationCount("node.list");
  await page.getByTestId("refresh-routes").click();
  await expect.poll(() => operationCount("node.list")).toBeGreaterThan(afterRoutes);
});

test("supports language and theme selectors before login", async () => {
  await renderLogin();

  await expect
    .element(page.getByTestId("github-repository-link"))
    .toHaveAttribute("href", "https://github.com/MunMunMiao/headscale-ui");
  expectPointerCursor("github-repository-link");
  preventNextClickDefault("github-repository-link");
  await page.getByTestId("github-repository-link").click();

  await page.getByTestId("profile-option-new").click();
  expectConnectionFormGridLayout();
  const connectionHeader = document.querySelector<HTMLElement>(
    '[data-testid="connection-dialog"] [data-slot="dialog-header"]',
  );
  expect(connectionHeader?.querySelector("svg")).toBeNull();
  expect(
    document.querySelector('[data-testid="connection-dialog"] [data-slot="dialog-close"]'),
  ).toBeNull();
  expectDialogHasNoInternalScrollbar("connection-dialog");
  expect(document.querySelector('[data-testid="save-profile"]')).toBeNull();
  await expect.element(page.getByTestId("connect-submit")).toHaveTextContent("Add");
  await expect.element(page.getByTestId("connect-close")).toHaveTextContent("Close");
  await expect
    .element(page.getByTestId("api-key-guide"))
    .toHaveTextContent("headscale apikeys create --expiration 90d");
  await expect
    .element(page.getByTestId("api-key-docs-link"))
    .toHaveAttribute("href", "https://docs.headscale.org/ref/remote-cli/");
  await page.getByTestId("api-key-command-copy").click();
  await closeLayerWithEscape("connection-dialog");

  await page.getByTestId("locale-select").click();
  await page.getByTestId("locale-option-zh").click();
  expect(document.documentElement.lang).toBe("zh");
  await page.getByTestId("profile-option-new").click();
  await expect.element(page.getByTestId("connect-submit")).toHaveTextContent("添加");
  await closeLayerWithEscape("connection-dialog");

  await page.getByTestId("theme-select").click();
  await page.getByTestId("theme-option-dark").click();
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(await readIdbSetting("theme")).toBe("dark");

  await page.getByTestId("theme-select").click();
  await page.getByTestId("theme-option-auto").click();
  expect(await readIdbSetting("theme")).toBe("auto");
});

test("requires explicit confirmation before closing a dirty add profile dialog", async () => {
  await renderLogin();

  await page.getByTestId("profile-option-new").click();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();
  expect(
    document.querySelector('[data-testid="connection-dialog"] [data-slot="dialog-close"]'),
  ).toBeNull();

  await clickDialogOverlay();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();

  await page.getByTestId("connect-close").click();
  await expect.poll(() => document.querySelector('[data-testid="connection-dialog"]')).toBeNull();

  await page.getByTestId("profile-option-new").click();
  await page.getByTestId("connect-profile-name").fill("Dirty profile");
  await clickDialogOverlay();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();
  expect(document.querySelector('[data-testid="discard-profile-changes-dialog"]')).toBeNull();

  await page.getByTestId("connect-close").click();
  await expect.element(page.getByTestId("discard-profile-changes-dialog")).toBeVisible();
  await page.getByTestId("keep-editing-profile").click();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();

  await page.getByTestId("connect-close").click();
  await page.getByTestId("discard-profile-changes").click();
  await expect.poll(() => document.querySelector('[data-testid="connection-dialog"]')).toBeNull();
});

test("keeps the add profile dialog inside a short mobile viewport", async () => {
  await page.viewport(390, 640);
  await renderLogin();

  await page.getByTestId("profile-option-new").click();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();
  expectDialogUsableInViewport("connection-dialog");
  expectTestIdFitsViewport("connect-api-key");
  expectTestIdAboveTestId("connect-api-key", "connect-footer");
  expectTestIdFitsViewport("connect-submit");
  expectNoHorizontalOverflow();
});

test("keeps core dialogs usable on a short mobile viewport", async () => {
  await page.viewport(360, 568);
  await renderLogin();

  await page.getByTestId("profile-option-new").click();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();
  expectDialogUsableInViewport("connection-dialog");
  expectTestIdFitsViewport("connect-api-key");
  expectTestIdAboveTestId("connect-api-key", "connect-footer");
  expectTestIdFitsViewport("connect-submit");
  await captureResponsiveScreenshot("add-server-360x568");
  await closeLayerWithEscape("connection-dialog");

  await connectWithDefaults();

  await selectSectionTab("members");
  await openCreateMemberDialog();
  expectDialogUsableInViewport("member-create-dialog");
  await closeLayerWithEscape("member-create-dialog");

  await selectSectionTab("invites");
  await page.getByTestId("open-create-invite").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  expectDialogUsableInViewport("invite-create-dialog");
  await page.getByTestId("invite-expiration").click();
  expectLayerFitsViewport('[data-slot="popover-content"]');
  await captureResponsiveScreenshot("auth-key-date-picker-360x568");
  await userEvent.keyboard("{Escape}");
  await closeLayerWithEscape("invite-create-dialog");

  await selectSectionTab("devices");
  await page.getByTestId("add-device-toggle").click();
  await expect.element(page.getByTestId("add-device-dialog")).toBeVisible();
  expectDialogUsableInViewport("add-device-dialog");
  await captureResponsiveScreenshot("add-device-360x568");
  await closeLayerWithEscape("add-device-dialog");

  await selectSectionTab("access");
  await page.getByTestId("new-team").click();
  await expect.element(page.getByTestId("team-detail-dialog")).toBeVisible();
  expectDialogUsableInViewport("team-detail-dialog");
  await captureResponsiveScreenshot("team-detail-360x568");
  await closeLayerWithEscape("team-detail-dialog");

  await page.getByTestId("new-device-label").click();
  await expect.element(page.getByTestId("tag-detail-dialog")).toBeVisible();
  expectDialogUsableInViewport("tag-detail-dialog");
  await closeLayerWithEscape("tag-detail-dialog");

  // Force the unsaved-changes AlertDialog onto the 360px viewport — its three
  // stacked buttons (keep editing / discard / save and close) must all fit.
  await page.getByTestId("team-card-group:ops").click();
  await expect.element(page.getByTestId("team-detail-dialog")).toBeVisible();
  const memberToRemove = document.querySelector(
    '[data-testid^="team-member-remove-"]',
  ) as HTMLElement | null;
  expect(memberToRemove).not.toBeNull();
  memberToRemove?.click();
  await page.getByTestId("team-detail-close").click();
  await expect.element(page.getByTestId("unsaved-changes-dialog")).toBeVisible();
  expectDialogUsableInViewport("unsaved-changes-dialog");
  expectTestIdFitsViewport("unsaved-changes-keep-editing");
  expectTestIdFitsViewport("unsaved-changes-discard");
  expectTestIdFitsViewport("unsaved-changes-save");
  await captureResponsiveScreenshot("unsaved-changes-360x568");
  await page.getByTestId("unsaved-changes-discard").click();

  expectNoHorizontalOverflow();
});

test("keeps mobile overview statistics dense", async () => {
  await page.viewport(360, 568);
  await renderLogin();
  await connectWithDefaults();

  await expect.element(page.getByTestId("section-home")).toBeVisible();
  expectOverviewStatsCompactGrid();
  expectNoHorizontalOverflow();
  await captureResponsiveScreenshot("home-overview-360x568");
});

test("uses pointer cursors for buttons, links, menus and tabs", async () => {
  await renderLogin();

  expectPointerCursor("profile-option-new");
  expectVisibleInteractiveElementsUsePointer();
  await page.getByTestId("profile-option-new").click();
  await expect.element(page.getByTestId("connect-form")).toBeVisible();
  expectPointerCursor("api-key-docs-link");
  expectPointerCursor("connect-submit");
  expectVisibleInteractiveElementsUsePointer();

  await connectWithDefaults();
  expectPointerCursor("github-repository-link");
  preventNextClickDefault("github-repository-link");
  await page.getByTestId("github-repository-link").click();
  expectPointerCursor("profile-menu-trigger");
  expectPointerCursor("section-devices");
  expectVisibleInteractiveElementsUsePointer();

  await openProfileMenu();
  expectPointerCursor("language-menu-trigger");
  expectVisibleInteractiveElementsUsePointer();
  clickDomTestId("language-menu-trigger");
  await expect.element(page.getByTestId("locale-option-zh")).toBeVisible();
  expectPointerCursor("locale-option-zh");
  expectVisibleInteractiveElementsUsePointer();
  await closeProfileMenu();
});

test("supports consumer-friendly tailnet management flows", async () => {
  window.__headscaleUiOperationCalls = [];

  await renderLogin();
  await page.getByTestId("profile-option-new").click();
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
  await expectMachinesWorkbench();
  await page.getByTestId("device-owner-link-1").click();
  await expect.element(page.getByTestId("user-detail-dialog")).toHaveTextContent("Alice Ops");
  await closeLayerWithEscape("user-detail-dialog");
  await page.getByTestId("device-detail-link-1").click();
  await expect.element(page.getByTestId("device-detail-dialog")).toBeVisible();
  await expect.element(page.getByTestId("device-detail-status-1")).toHaveTextContent("Online");
  await page.getByTestId("device-detail-owner-1").click();
  await expect.element(page.getByTestId("user-detail-dialog")).toBeVisible();
  await expect.element(page.getByTestId("user-detail-device-1")).toHaveTextContent("alice-laptop");
  await page.getByTestId("user-detail-device-1").click();
  await expect.element(page.getByTestId("device-detail-dialog")).toHaveTextContent("alice-laptop");
  await closeLayerWithEscape("device-detail-dialog");
  await page.getByTestId("device-detail-link-2").click();
  await expect.element(page.getByTestId("device-detail-dialog")).toHaveTextContent("edge-router");
  await closeLayerWithEscape("device-detail-dialog");
  await page.getByTestId("section-devices").click();
  await page.getByTestId("machine-filter").selectOptions("routes");
  await page.getByTestId("device-pending-routes-2").click();
  await expect.element(page.getByTestId("route-node-2")).toBeVisible();
  expect(window.location.pathname.endsWith("/routes")).toBe(true);
  await page.getByTestId("section-devices").click();
  await page.getByTestId("machine-filter").selectOptions("all");
  expect(document.querySelector('[data-testid="machine-actions-1"]')).toBeNull();
  await page.getByTestId("machine-actions-trigger-1").click();
  await expect.element(page.getByTestId("machine-actions-menu-1")).toBeVisible();
  await page.getByTestId("view-node-details-action-1").click();
  await expect.element(page.getByTestId("device-detail-dialog")).toHaveTextContent("alice-laptop");
  await closeLayerWithEscape("device-detail-dialog");
  await page.getByTestId("machine-actions-trigger-2").click();
  await expect.element(page.getByTestId("machine-actions-menu-2")).toBeVisible();
  await page.getByTestId("view-node-routes-action-2").click();
  await expect.element(page.getByTestId("route-node-2")).toBeVisible();
  expect(window.location.pathname.endsWith("/routes")).toBe(true);
  await page.getByTestId("section-devices").click();
  await page.getByTestId("machine-actions-trigger-1").click();
  await expect.element(page.getByTestId("machine-actions-menu-1")).toBeVisible();
  expect(document.querySelector('[data-testid="rename-node-1"]')).toBeNull();
  await page.getByTestId("rename-node-action-1").click();
  await expect.element(page.getByTestId("rename-node-dialog")).toBeVisible();
  await page.getByTestId("rename-node-cancel").click();
  await page.getByTestId("machine-actions-trigger-1").click();
  await page.getByTestId("rename-node-action-1").click();
  await expect.element(page.getByTestId("rename-node-dialog")).toBeVisible();
  await page.getByTestId("rename-node-dialog-input").fill("alice-main");
  await page.getByTestId("rename-node-confirm").click();
  await expect.element(page.getByTestId("device-1")).toHaveTextContent("alice-main");
  await page.getByTestId("machine-actions-trigger-1").click();
  await expect.element(page.getByTestId("machine-actions-menu-1")).toBeVisible();
  await page.getByTestId("edit-node-tags-action-1").click();
  await expect.element(page.getByTestId("node-tags-dialog")).toBeVisible();
  await page.getByTestId("node-tags-input").fill("tag:workstation, tag:laptop");
  await page.getByTestId("node-tags-cancel").click();
  await page.getByTestId("machine-actions-trigger-1").click();
  await page.getByTestId("edit-node-tags-action-1").click();
  await expect.element(page.getByTestId("node-tags-dialog")).toBeVisible();
  await page.getByTestId("node-tags-input").fill("tag:laptop");
  await page.getByTestId("node-tags-confirm").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "node.setTags"))
    .toBe(true);

  window.__headscaleUiOperationCalls = [];
  await page.getByTestId("section-routes").click();
  await expect.element(page.getByTestId("route-node-3")).toBeVisible();
  await page.getByTestId("route-user-link-3").click();
  await expect.element(page.getByTestId("member-charlie")).toBeVisible();
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
  await page.getByTestId("approve-route-cancel").click();
  expect(
    window.__headscaleUiOperationCalls?.some((call) => call.id === "node.setApprovedRoutes"),
  ).toBe(false);
  await page.getByTestId("approve-route-2-0").click();
  await expect.element(page.getByTestId("approve-route-dialog")).toBeVisible();
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
}, 30000);

test("covers dashboard refresh, machine filters, exports and machine lifecycle actions", async () => {
  await renderLogin();
  await connectWithDefaults();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("refresh-data").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "health.check"))
    .toBe(true);
  expect(document.querySelector('[data-testid="header-server-signal"]')).toBeNull();
  expect(document.querySelector('[data-testid="overview-health-metrics"]')).toBeNull();
  expect(document.querySelector('[data-testid="overview-server-health"]')).toBeNull();
  expect(document.querySelector('[data-testid="overview-server-reachability"]')).toBeNull();
  expect(document.querySelector('[data-testid="overview-database-health"]')).toBeNull();
  await expect
    .poll(
      () =>
        document.querySelector<HTMLButtonElement>('[data-testid="refresh-data"]')?.disabled ?? true,
    )
    .toBe(false);
  window.__headscaleUiOperationCalls = [];
  await new Promise((resolve) => window.setTimeout(resolve, 5200));
  expect(
    window.__headscaleUiOperationCalls?.filter((call) => call.id === "health.check").length ?? 0,
  ).toBe(0);

  await page.getByTestId("section-devices").click();
  await expectMachinesWorkbench();
  await page.getByTestId("device-search").fill("edge");
  expect(document.querySelector('[data-testid="device-1"]')).toBeNull();
  await page.getByTestId("machine-filter").selectOptions("routes");
  await expect.element(page.getByTestId("device-2")).toBeVisible();
  await page.getByTestId("clear-machine-filters").click();
  await expectMachinesWorkbench();

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
  await page.getByTestId("expire-node-cancel").click();
  expect(
    window.__headscaleUiOperationCalls?.filter((call) => call.id === "node.expire").length,
  ).toBe(expireCallsBefore);
  await page.getByTestId("machine-actions-trigger-3").click();
  await page.getByTestId("expire-node-action-3").click();
  await expect.element(page.getByTestId("expire-node-dialog")).toBeVisible();
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

test("keeps failed destructive member actions busy and error-visible", async () => {
  await renderLogin();
  await connectWithDefaults();

  await page.getByTestId("section-members").click();
  await expect.element(page.getByTestId("user-table")).toBeVisible();
  await page.getByTestId("member-actions-trigger-alice").click();
  await page.getByTestId("delete-member-alice").click();
  await expect.element(page.getByTestId("delete-member-dialog")).toBeVisible();
  await expect.element(page.getByTestId("delete-member-policy-impact")).toBeVisible();
  await page.getByTestId("delete-member-cleanup-policy").click();
  await page.getByTestId("delete-member-cleanup-policy").click();
  await page.getByTestId("confirm-delete-member").click();

  const confirmButton = document.querySelector<HTMLButtonElement>(
    '[data-testid="confirm-delete-member"]',
  );
  expect(confirmButton?.disabled).toBe(true);
  expect(confirmButton?.querySelector(".animate-spin")).toBeTruthy();
  await expect.element(page.getByTestId("delete-member-error")).toHaveTextContent("auth keys");
  await expect.element(page.getByTestId("delete-member-dialog")).toBeVisible();
  await expect.element(page.getByTestId("member-alice")).toBeVisible();
});

test("covers the empty machine state and add-first-device flow", async () => {
  await renderLogin();
  await connectWithDefaults();

  await page.getByTestId("section-devices").click();
  for (const nodeId of ["1", "2", "3"]) {
    await page.getByTestId(`machine-actions-trigger-${nodeId}`).click();
    await page.getByTestId(`remove-node-action-${nodeId}`).click();
    await expect.element(page.getByTestId("remove-node-dialog")).toBeVisible();
    await page.getByTestId("remove-node-confirm").click();
    await expect.poll(() => document.querySelector(`[data-testid="device-${nodeId}"]`)).toBeNull();
  }

  await expect.element(page.getByTestId("machines-empty")).toBeVisible();
  await page.getByTestId("add-first-device").click();
  await expect.element(page.getByTestId("add-device-dialog")).toBeVisible();
  await expect.element(page.getByTestId("add-device-stepper")).toBeVisible();
  await expect.element(page.getByTestId("device-setup-flow")).toBeVisible();
  await expect.element(page.getByTestId("setup-device-step")).toBeVisible();
  await expect.element(page.getByTestId("setup-tags")).toHaveValue("");
});

test("renames a machine reached from a user detail navigation", async () => {
  await renderLogin();
  await connectWithDefaults();

  await page.getByTestId("section-members").click();
  await page.getByTestId("member-detail-link-alice").click();
  await expect.element(page.getByTestId("user-detail-dialog")).toHaveTextContent("Alice Ops");
  await page.getByTestId("user-detail-device-1").click();
  await expect.element(page.getByTestId("device-detail-dialog")).toHaveTextContent("alice-laptop");
  await closeLayerWithEscape("device-detail-dialog");

  await page.getByTestId("member-actions-trigger-alice").click();
  await page.getByTestId("view-member-machines-alice").click();
  await expect.element(page.getByTestId("device-search")).toHaveValue("alice@example.com");
  await page.getByTestId("machine-actions-trigger-1").click();
  await page.getByTestId("edit-node-tags-action-1").click();
  await expect.element(page.getByTestId("node-tags-dialog")).toBeVisible();
  await page.getByTestId("node-tags-cancel").click();
  await page.getByTestId("machine-actions-trigger-1").click();
  await page.getByTestId("rename-node-action-1").click();
  await expect.element(page.getByTestId("rename-node-dialog")).toBeVisible();
  await page.getByTestId("rename-node-dialog-input").fill("alice-from-user");
  await page.getByTestId("rename-node-confirm").click();
  await expect.element(page.getByTestId("device-1")).toHaveTextContent("alice-from-user");
});

test("covers user filters, user export and member deletion", async () => {
  await renderLogin();
  await connectWithDefaults();

  await page.getByTestId("section-members").click();
  await expect.element(page.getByTestId("member-alice")).toBeVisible();
  expect(document.querySelector('[data-testid="member-alice"]')?.closest("table")).toBeTruthy();
  expect(
    document.querySelector('[data-testid="user-search"]')?.closest('[data-testid="user-table"]'),
  ).toBeNull();
  expect(
    document.querySelector('[data-testid="user-search"]')?.closest('[data-testid="user-toolbar"]'),
  ).toBeTruthy();
  inputDomTestId("user-search", "charlie");
  await expect.element(page.getByTestId("member-charlie")).toBeVisible();
  await expect.element(page.getByTestId("member-auth-source-charlie")).toHaveTextContent("oidc");
  const memberDeviceTags = document.querySelector<HTMLElement>(
    '[data-testid="member-device-tags-charlie"]',
  );
  expect(memberDeviceTags).toBeTruthy();
  expect(getComputedStyle(memberDeviceTags as HTMLElement).display).toBe("grid");
  await expect
    .element(page.getByTestId("member-device-tag-charlie-3"))
    .toHaveTextContent("old-phone");
  await page.getByTestId("member-device-tag-charlie-3").click();
  await expect.element(page.getByTestId("device-detail-dialog")).toHaveTextContent("old-phone");
  await closeLayerWithEscape("device-detail-dialog");
  await page.getByTestId("member-detail-link-charlie").click();
  await expect.element(page.getByTestId("user-detail-dialog")).toHaveTextContent("Charlie");
  await expect.element(page.getByTestId("user-detail-dialog")).toHaveTextContent("oidc");
  await closeLayerWithEscape("user-detail-dialog");
  clickDomTestId("member-actions-trigger-charlie");
  await page.getByTestId("assign-member-groups-charlie").click();
  await expect.element(page.getByTestId("assign-user-groups-dialog")).toBeVisible();
  await page.getByTestId("assign-user-groups-cancel").click();
  clickDomTestId("member-actions-trigger-charlie");
  await page.getByTestId("assign-member-tags-charlie").click();
  await expect.element(page.getByTestId("assign-user-tags-dialog")).toBeVisible();
  await page.getByTestId("assign-user-tags-cancel").click();
  clickDomTestId("member-actions-trigger-charlie");
  await page.getByTestId("view-member-details-charlie").click();
  await expect.element(page.getByTestId("user-detail-dialog")).toHaveTextContent("Charlie");
  await closeLayerWithEscape("user-detail-dialog");
  clickDomTestId("member-actions-trigger-charlie");
  await page.getByTestId("create-invite-for-member-charlie").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  await expect.element(page.getByTestId("invite-user")).toHaveValue("3");
  await page.getByTestId("cancel-create-invite").click();
  clickDomTestId("member-actions-trigger-charlie");
  await page.getByTestId("view-member-machines-charlie").click();
  await expect.element(page.getByTestId("device-search")).toHaveValue("charlie@example.com");
  await expect.element(page.getByTestId("device-3")).toBeVisible();
  await page.getByTestId("section-members").click();
  await expect.element(page.getByTestId("member-alice")).toBeVisible();
  inputDomTestId("user-search", "charlie");
  await expect.poll(() => document.querySelector('[data-testid="member-alice"]')).toBeNull();
  inputDomTestId("user-search", "");
  selectDomTestId("user-filter", "service");
  expect(document.querySelector('[data-testid="member-tagged-devices"]')).toBeNull();
  await expect.element(page.getByTestId("user-table")).toHaveTextContent("No users match");
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
  await page.getByTestId("member-actions-trigger-erin").click();
  await page.getByTestId("rename-member-erin").click();
  await expect.element(page.getByTestId("rename-member-dialog")).toBeVisible();
  await page.getByTestId("rename-member-name").fill("erin-admin");
  await page.getByTestId("rename-member-cancel").click();
  await expect
    .poll(() => document.querySelector('[data-testid="rename-member-dialog"]'))
    .toBeNull();
  await expect.element(page.getByTestId("member-actions-trigger-erin")).toBeVisible();
  await page.getByTestId("member-actions-trigger-erin").click();
  await page.getByTestId("rename-member-erin").click();
  await expect.element(page.getByTestId("rename-member-dialog")).toBeVisible();
  await page.getByTestId("rename-member-name").fill("erin-admin");
  await page.getByTestId("confirm-rename-member").click();
  await expect.element(page.getByTestId("member-erin-admin")).toBeVisible();
  await page.getByTestId("member-actions-trigger-erin-admin").click();
  await page.getByTestId("delete-member-erin-admin").click();
  await expect.element(page.getByTestId("delete-member-dialog")).toBeVisible();
  await page.getByTestId("cancel-delete-member").click();
  await expect
    .poll(() => document.querySelector('[data-testid="delete-member-dialog"]'))
    .toBeNull();
  await expect.element(page.getByTestId("member-actions-trigger-erin-admin")).toBeVisible();
  await page.getByTestId("member-actions-trigger-erin-admin").click();
  await page.getByTestId("delete-member-erin-admin").click();
  await expect.element(page.getByTestId("delete-member-dialog")).toBeVisible();
  await page.getByTestId("confirm-delete-member").click();
  expect(document.querySelector('[data-testid="member-erin-admin"]')).toBeNull();
  await openCreateMemberDialog();
  await page.getByTestId("member-name").fill("erin");
  await page.getByTestId("create-member").click();
  await expect.element(page.getByTestId("member-erin")).toBeVisible();
  await page.getByTestId("member-actions-trigger-erin").click();
  await page.getByTestId("delete-member-erin").click();
  await expect.element(page.getByTestId("delete-member-dialog")).toBeVisible();
  await page.getByTestId("confirm-delete-member").click();
  expect(document.querySelector('[data-testid="member-erin"]')).toBeNull();
});

test("covers auth-key filters, expiration and deletion", async () => {
  await renderLogin();
  await connectWithDefaults();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("section-invites").click();
  await expect.element(page.getByTestId("invite-table")).toBeVisible();
  expect(document.querySelector('[data-testid="invite-1"]')?.closest("table")).toBeTruthy();
  await page.getByTestId("invite-owner-link-1").click();
  await expect.element(page.getByTestId("user-detail-dialog")).toHaveTextContent("Alice Ops");
  clickLastByTestIdPrefix("remove-user-policy-reference-");
  await closeLayerWithEscape("user-detail-dialog");
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
  expect(document.querySelector('[data-testid="invite-tag-2-0"]')).toBeNull();
  expect(document.querySelector('[data-testid="invite-2"]')?.textContent).not.toMatch(
    /No tags|无标签/,
  );
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

  await page.getByTestId("invite-actions-trigger-1").click();
  await page.getByTestId("expire-invite-1").click();
  await expect.element(page.getByTestId("expire-invite-dialog")).toBeVisible();
  await page.getByTestId("cancel-invite-action").click();
  await page.getByTestId("invite-actions-trigger-1").click();
  await page.getByTestId("expire-invite-1").click();
  await expect.element(page.getByTestId("expire-invite-dialog")).toBeVisible();
  await page.getByTestId("confirm-invite-action").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "preauthkey.expire"))
    .toBe(true);
  await page.getByTestId("invite-actions-trigger-2").click();
  await page.getByTestId("delete-invite-2").click();
  await expect.element(page.getByTestId("delete-invite-dialog")).toBeVisible();
  await page.getByTestId("confirm-invite-action").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "preauthkey.delete"))
    .toBe(true);
  expect(document.querySelector('[data-testid="invite-2"]')).toBeNull();
});

async function resetMockPolicy(policyJson: string) {
  const { mockClient } = useHeadscaleClient();
  await mockClient.setPolicy({ policy: policyJson });
  const { refreshSnapshot } = useSnapshot();
  await refreshSnapshot();
}

async function openAccessSection() {
  await page.getByTestId("section-access").click();
  // Wait for either the populated layout or the empty-state layout to render.
  await expect
    .poll(
      () =>
        document.querySelector('[data-testid="teams-section"]') ||
        document.querySelector('[data-testid="resource-access-empty"]'),
    )
    .toBeTruthy();
}

test("renders initial mock policy with team/tag cards and risk banners", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();

  await expect.element(page.getByTestId("team-card-group:ops")).toBeVisible();
  await expect.element(page.getByTestId("tag-card-tag:server")).toBeVisible();
  await expect.element(page.getByTestId("tag-card-tag:workstation")).toBeVisible();

  await expect.element(page.getByTestId("open-access-banner")).toBeVisible();
  await expect.element(page.getByTestId("orphan-ref-banner")).toBeVisible();

  expect(document.querySelector('[data-testid="resource-access-empty"]')).toBeNull();
  expectNoRawPolicyEditor();
});

test("clean up orphan refs banner: cancel keeps them, confirm strips them", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();

  await expect.element(page.getByTestId("orphan-ref-banner")).toBeVisible();
  await page.getByTestId("cleanup-orphan-refs").click();
  await expect.element(page.getByTestId("cleanup-orphans-dialog")).toBeVisible();

  // Cancel keeps the orphan banner around.
  await page.getByTestId("cleanup-orphans-cancel").click();
  await expect.element(page.getByTestId("orphan-ref-banner")).toBeVisible();

  // Confirm wipes the references; banner disappears once state is clean.
  await page.getByTestId("cleanup-orphan-refs").click();
  await page.getByTestId("cleanup-orphans-confirm").click();
  await expect.poll(() => document.querySelector('[data-testid="orphan-ref-banner"]')).toBeNull();
});

test("unsaved-changes dialog covers cancel, discard and save-and-close paths", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();
  window.__headscaleUiOperationCalls = [];

  // Open team detail; clean state — Escape closes silently.
  await page.getByTestId("team-card-group:ops").click();
  await expect.element(page.getByTestId("team-detail-dialog")).toBeVisible();

  // Make it dirty by removing an existing member. The mock policy must give
  // group:ops at least one member — fail loudly if that ever changes.
  const memberRow = document.querySelector(
    '[data-testid^="team-member-remove-"]',
  ) as HTMLElement | null;
  expect(memberRow).not.toBeNull();
  memberRow?.click();

  // Escape now triggers the unsaved-changes confirm.
  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByTestId("unsaved-changes-dialog")).toBeVisible();

  // Keep-editing returns to the team dialog with edits intact.
  await page.getByTestId("unsaved-changes-keep-editing").click();
  await expect
    .poll(() => document.querySelector('[data-testid="unsaved-changes-dialog"]'))
    .toBeNull();
  await expect.element(page.getByTestId("team-detail-dialog")).toBeVisible();

  // Escape again, this time discard. The global unsaved badge must vanish
  // along with the dialog — that's the contract of "Close without saving".
  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByTestId("unsaved-changes-dialog")).toBeVisible();
  await page.getByTestId("unsaved-changes-discard").click();
  await expect.poll(() => document.querySelector('[data-testid="team-detail-dialog"]')).toBeNull();
  await expect
    .poll(() => document.querySelector('[data-testid="save-policy-dirty-badge"]'))
    .toBeNull();

  // Reopen — discard should have restored the original state, so the member
  // row is back. Dirty it again, this time use save-and-close.
  await page.getByTestId("team-card-group:ops").click();
  await expect.element(page.getByTestId("team-detail-dialog")).toBeVisible();
  const memberRow2 = document.querySelector(
    '[data-testid^="team-member-remove-"]',
  ) as HTMLElement | null;
  expect(memberRow2).not.toBeNull();
  memberRow2?.click();
  await userEvent.keyboard("{Escape}");
  await page.getByTestId("unsaved-changes-save").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);
});

test("creates a team, adds a member, saves and reopens it", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("new-team").click();
  await expect.element(page.getByTestId("team-detail-dialog")).toBeVisible();

  inputDomTestId("team-name-input", "dev");
  await page.getByTestId("team-name-confirm").click();
  await expect.element(page.getByTestId("team-members-section")).toBeVisible();

  await page.getByTestId("team-add-member-trigger").click();
  await expect.element(page.getByTestId("team-add-member-content")).toBeVisible();
  await page.getByTestId("team-add-member-option-alice@example.com").click();
  await expect.element(page.getByTestId("team-member-row-alice@example.com")).toBeVisible();

  // Dialog is dirty (a member was added) — "Done" routes through the unsaved-
  // changes confirm. Save-and-close persists the policy in one step.
  await page.getByTestId("team-detail-close").click();
  await expect.element(page.getByTestId("unsaved-changes-dialog")).toBeVisible();
  await page.getByTestId("unsaved-changes-save").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);
  await expect.element(page.getByTestId("team-card-group:dev")).toBeVisible();

  const saved = latestSavedPolicy();
  expect(saved.groups?.["group:dev"]).toEqual(["alice@example.com"]);

  await page.getByTestId("team-card-group:dev").click();
  await expect.element(page.getByTestId("team-detail-dialog")).toBeVisible();
  await expect.element(page.getByTestId("team-member-row-alice@example.com")).toBeVisible();
  await page.getByTestId("team-member-remove-alice@example.com").click();
  await expect
    .poll(() => document.querySelector('[data-testid="team-member-row-alice@example.com"]'))
    .toBeNull();
  // Removing the member made the dialog dirty again. Discard returns to the
  // last saved state, and the global "unsaved" badge must disappear with it.
  await page.getByTestId("team-detail-close").click();
  await expect.element(page.getByTestId("unsaved-changes-dialog")).toBeVisible();
  await page.getByTestId("unsaved-changes-discard").click();
  await expect
    .poll(() => document.querySelector('[data-testid="save-policy-dirty-badge"]'))
    .toBeNull();
});

test("creates a device label with an accessor + label manager and saves the rule", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("new-device-label").click();
  await expect.element(page.getByTestId("tag-detail-dialog")).toBeVisible();
  inputDomTestId("tag-name-input", "db");
  await page.getByTestId("tag-name-confirm").click();
  await expect.element(page.getByTestId("tag-accessors-section")).toBeVisible();
  await expect.element(page.getByTestId("tag-owners-section")).toBeVisible();

  await page.getByTestId("tag-add-accessor-trigger").click();
  await expect.element(page.getByTestId("tag-add-accessor-content")).toBeVisible();
  await page.getByTestId("tag-add-accessor-option-group:ops").click();
  await expect.element(page.getByTestId("tag-accessor-row-group:ops")).toBeVisible();

  clickDomTestId("tag-accessor-svc-group:ops-web");
  // Custom-port input commits on blur — use the page-level fill helper which
  // focuses/types/blurs in a way the framework can drive end-to-end.
  await page.getByTestId("tag-accessor-custom-group:ops").fill("8080");
  // Force commit by also pressing Enter (handler is bound on both blur + Enter).
  await userEvent.keyboard("{Enter}");

  await page.getByTestId("tag-add-owner-trigger").click();
  await page.getByTestId("tag-add-owner-option-group:ops").click();
  await expect.element(page.getByTestId("tag-owner-row-group:ops")).toBeVisible();

  // Tag dialog is dirty — close routes through the unsaved-changes confirm.
  await page.getByTestId("tag-detail-close").click();
  await expect.element(page.getByTestId("unsaved-changes-dialog")).toBeVisible();
  await page.getByTestId("unsaved-changes-save").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);
  await expect.element(page.getByTestId("tag-card-tag:db")).toBeVisible();

  const saved = latestSavedPolicy();
  expect(saved.tagOwners?.["tag:db"]).toEqual(["group:ops"]);
  const dbRule = saved.acls?.find(
    (r: { src: string[]; dst: string[] }) =>
      r.src?.[0] === "group:ops" && r.dst?.[0]?.startsWith("tag:db:"),
  );
  expect(dbRule).toBeTruthy();
  const portsString = dbRule?.dst?.[0]?.split(":").at(-1) ?? "";
  expect(portsString).toContain("22");
  expect(portsString).toContain("80");
  expect(portsString).toContain("443");
  expect(portsString).toContain("8080");
});

test("removes an accessor row from a tag detail dialog", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();

  // Set up a fresh tag with one accessor so we have something to remove.
  await page.getByTestId("new-device-label").click();
  inputDomTestId("tag-name-input", "scratch");
  await page.getByTestId("tag-name-confirm").click();
  await page.getByTestId("tag-add-accessor-trigger").click();
  await page.getByTestId("tag-add-accessor-option-group:ops").click();
  await expect.element(page.getByTestId("tag-accessor-row-group:ops")).toBeVisible();

  await page.getByTestId("tag-accessor-remove-group:ops").click();
  await expect
    .poll(() => document.querySelector('[data-testid="tag-accessor-row-group:ops"]'))
    .toBeNull();
  // The dialog can be re-portaled after removing the accessor; re-query the close button.
  await expect.element(page.getByTestId("tag-detail-dialog")).toBeVisible();
  // Dirty (we created a tag + removed an accessor) — discard to return to baseline.
  await page.getByTestId("tag-detail-close").click();
  await page.getByTestId("unsaved-changes-discard").click();
});

test("removes a tag owner and saves the cleanup", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("tag-card-tag:server").click();
  await expect.element(page.getByTestId("tag-detail-dialog")).toBeVisible();
  await expect.element(page.getByTestId("tag-owner-row-alice@")).toBeVisible();
  await page.getByTestId("tag-owner-remove-alice@").click();
  await expect
    .poll(() => document.querySelector('[data-testid="tag-owner-row-alice@"]'))
    .toBeNull();
  // Dialog is dirty — close routes through the unsaved-changes confirm.
  await page.getByTestId("tag-detail-close").click();
  await page.getByTestId("unsaved-changes-save").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);

  const saved = latestSavedPolicy();
  const stillHasOwner = saved.tagOwners?.["tag:server"]?.includes?.("alice@") ?? false;
  expect(stillHasOwner).toBe(false);
});

test("cancels then confirms removal of a team", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();

  await page.getByTestId("team-remove-group:ops").click();
  await expectPolicyRemovalDialog();
  await page.getByTestId("cancel-remove-policy-item").click();
  await expectPolicyRemovalDialogClosed();
  await expect.element(page.getByTestId("team-card-group:ops")).toBeVisible();

  await page.getByTestId("team-remove-group:ops").click();
  await expectPolicyRemovalDialog();
  await page.getByTestId("confirm-remove-policy-item").click();
  await expectPolicyRemovalDialogClosed();
  await expect.poll(() => document.querySelector('[data-testid="team-card-group:ops"]')).toBeNull();
});

test("removes a device label and its policy entries via the card trash button", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("tag-remove-tag:server").click();
  await expectPolicyRemovalDialog();
  await page.getByTestId("confirm-remove-policy-item").click();
  await expectPolicyRemovalDialogClosed();

  // tag:server is also referenced by a mock node, so the card may still
  // render — but the saved policy must no longer contain its tagOwner entry.
  await page.getByTestId("save-policy").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);
  const saved = latestSavedPolicy();
  expect(saved.tagOwners?.["tag:server"]).toBeUndefined();
});

test("filters device labels via the search input", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();

  inputDomTestId("tag-search", "server");
  await expect.element(page.getByTestId("tag-card-tag:server")).toBeVisible();
  await expect
    .poll(() => document.querySelector('[data-testid="tag-card-tag:workstation"]'))
    .toBeNull();

  inputDomTestId("tag-search", "");
  await expect.element(page.getByTestId("tag-card-tag:workstation")).toBeVisible();
});

test("high-risk confirm appears when a service expands to all", async () => {
  await renderLogin();
  await connectWithDefaults();
  await openAccessSection();

  await page.getByTestId("tag-card-tag:workstation").click();
  await expect.element(page.getByTestId("tag-detail-dialog")).toBeVisible();
  await page.getByTestId("tag-add-accessor-trigger").click();
  await page.getByTestId("tag-add-accessor-option-group:ops").click();
  await expect.element(page.getByTestId("tag-accessor-row-group:ops")).toBeVisible();

  clickDomTestId("tag-accessor-svc-group:ops-all");
  await expect.element(page.getByTestId("high-risk-confirm-dialog")).toBeVisible();
  await page.getByTestId("high-risk-cancel").click();
  await expect
    .poll(() => document.querySelector('[data-testid="high-risk-confirm-dialog"]') === null)
    .toBe(true);
  // Adding the accessor made the dialog dirty — discard to clean up.
  await page.getByTestId("tag-detail-close").click();
  await page.getByTestId("unsaved-changes-discard").click();
});

test("empty state renders templates and applies one", async () => {
  await renderLogin();
  await connectWithDefaults();
  await resetMockPolicy("");
  await openAccessSection();

  await expect.element(page.getByTestId("resource-access-empty")).toBeVisible();
  await expect.element(page.getByTestId("template-card-self-only")).toBeVisible();
  await expect.element(page.getByTestId("template-card-small-team")).toBeVisible();
  await expect.element(page.getByTestId("template-card-split-env")).toBeVisible();

  await page.getByTestId("empty-create-team").click();
  await expect.element(page.getByTestId("team-detail-dialog")).toBeVisible();
  await page.getByTestId("team-detail-close").click();

  await page.getByTestId("empty-create-tag").click();
  await expect.element(page.getByTestId("tag-detail-dialog")).toBeVisible();
  await page.getByTestId("tag-detail-close").click();

  await page.getByTestId("template-apply-small-team").click();
  await expect.element(page.getByTestId("team-card-group:team")).toBeVisible();
  await expect.element(page.getByTestId("tag-card-tag:shared")).toBeVisible();
  expect(document.querySelector('[data-testid="resource-access-empty"]')).toBeNull();
});

test("blank policy: edits still trigger the unsaved-changes guard", async () => {
  // Regression guard: `isPolicyDirty` used to short-circuit to `false` whenever
  // `policyDraft` was an empty string, so on a fresh Headscale instance the
  // user could add a team, hit Close, and walk away with the edits silently
  // discarded. After the fix, an empty draft must still participate in dirty
  // detection.
  await renderLogin();
  await connectWithDefaults();
  await resetMockPolicy("");
  await openAccessSection();

  await expect.element(page.getByTestId("resource-access-empty")).toBeVisible();

  await page.getByTestId("empty-create-team").click();
  await expect.element(page.getByTestId("team-detail-dialog")).toBeVisible();
  inputDomTestId("team-name-input", "ops");
  await page.getByTestId("team-name-confirm").click();
  await expect.element(page.getByTestId("team-members-section")).toBeVisible();

  // Closing the dirty dialog must now route through the unsaved-changes guard.
  await page.getByTestId("team-detail-close").click();
  await expect.element(page.getByTestId("unsaved-changes-dialog")).toBeVisible();
  await page.getByTestId("unsaved-changes-discard").click();
  await expect
    .poll(() => document.querySelector('[data-testid="save-policy-dirty-badge"]'))
    .toBeNull();
});

test("IP-only rules collapse into the direct-device section", async () => {
  await renderLogin();
  await connectWithDefaults();
  await resetMockPolicy(
    JSON.stringify({
      acls: [{ action: "accept", src: ["alice@example.com"], dst: ["10.0.0.1:22"] }],
      groups: {},
      tagOwners: {},
    }),
  );
  await openAccessSection();

  await expect.element(page.getByTestId("ip-rules-section")).toBeVisible();
  expect(document.querySelector('[data-testid^="ip-rule-"]')).toBeTruthy();
  clickLastByTestIdPrefix("ip-rule-remove-");
  await expect.poll(() => document.querySelectorAll('[data-testid^="ip-rule-"]').length).toBe(0);
});

test("mobile save button posts a policy update", async () => {
  await renderLogin();
  await connectWithDefaults();
  await page.viewport(360, 768);
  await openAccessSection();
  window.__headscaleUiOperationCalls = [];

  await page.getByTestId("save-policy").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);
});

test("does not expose a settings page", async () => {
  await renderLogin();
  await connectWithDefaults();

  expect(document.querySelector('[data-testid="section-settings"]')).toBeNull();
  expect(document.querySelector('[data-testid^="settings-"]')).toBeNull();
  expect(document.querySelector('[data-testid="api-key-1"]')).toBeNull();
});

test("covers server settings API keys and maintenance actions", async () => {
  await renderLogin();
  await connectWithDefaults();
  window.__headscaleUiOperationCalls = [];
  const clipboard = stubClipboard();

  try {
    await openProfileMenu();
    await page.getByTestId("open-server-settings").click();
    await expect.element(page.getByTestId("server-settings-dialog")).toBeVisible();
    await page.getByTestId("server-tab-api-keys").click();
    await expect.element(page.getByTestId("api-key-table")).toBeVisible();
    const apiKeyListsBeforeRefresh = operationCount("apikey.list");
    await page.getByTestId("refresh-api-keys").click();
    await expect
      .poll(() => operationCount("apikey.list"))
      .toBeGreaterThan(apiKeyListsBeforeRefresh);
    await page.getByTestId("api-key-expiration").click();
    await userEvent.keyboard("{Escape}");
    await page.getByTestId("create-api-key-confirm").click();
    await expect.element(page.getByTestId("created-api-key")).toBeVisible();
    await page.getByTestId("copy-created-api-key").click();
    expect(clipboard.writes.some((value) => value.startsWith("ak_demo_"))).toBe(true);
    await expect
      .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "apikey.create"))
      .toBe(true);

    await page.getByTestId("api-key-actions-trigger-ak_live_demo").click();
    await page.getByTestId("expire-api-key-ak_live_demo").click();
    await expect.element(page.getByTestId("expire-api-key-dialog")).toBeVisible();
    await page.getByTestId("cancel-api-key-action").click();
    await page.getByTestId("api-key-actions-trigger-ak_live_demo").click();
    await page.getByTestId("expire-api-key-ak_live_demo").click();
    await expect.element(page.getByTestId("expire-api-key-dialog")).toBeVisible();
    await page.getByTestId("confirm-api-key-action").click();
    await expect
      .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "apikey.expire"))
      .toBe(true);

    await page.getByTestId("api-key-actions-trigger-ak_old_demo").click();
    await page.getByTestId("delete-api-key-ak_old_demo").click();
    await expect.element(page.getByTestId("delete-api-key-dialog")).toBeVisible();
    await page.getByTestId("confirm-api-key-action").click();
    await expect
      .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "apikey.delete"))
      .toBe(true);
    expect(document.querySelector('[data-testid="api-key-row-ak_old_demo"]')).toBeNull();

    await page.getByTestId("server-tab-maintenance").click();
    await expect.element(page.getByTestId("server-maintenance-settings")).toBeVisible();
    await page.getByTestId("open-backfill-node-ips").click();
    await expect.element(page.getByTestId("backfill-node-ips-dialog")).toBeVisible();
    await page.getByTestId("cancel-backfill-node-ips").click();
    await page.getByTestId("open-backfill-node-ips").click();
    await page.getByTestId("backfill-node-ips-confirmed").click();
    await page.getByTestId("confirm-backfill-node-ips").click();
    await expect
      .poll(() =>
        window.__headscaleUiOperationCalls?.some((call) => call.id === "node.backfillIps"),
      )
      .toBe(true);
    await expect.element(page.getByTestId("backfill-node-ips-result")).toBeVisible();

    await page.getByTestId("server-tab-security").click();
    await expect.element(page.getByTestId("security-settings")).toBeVisible();
  } finally {
    clipboard.restore();
  }
});

test("encrypts API keys at rest", async () => {
  await renderLogin();

  await page.getByTestId("profile-option-new").click();
  await expect.element(page.getByTestId("connect-form")).toBeVisible();
  await page.getByTestId("connect-profile-name").fill("Secure");
  await page.getByTestId("connect-api-key").fill("secret-bearer-token");
  await page.getByTestId("connect-submit").click();
  await expect.element(page.getByTestId("profile-row-Secure")).toBeVisible();

  // IndexedDB row exists with an encrypted ApiKeySecret, never the raw bearer token.
  const idbProfiles = await new Promise<unknown[]>((resolve, reject) => {
    const req = indexedDB.open("headscale-ui", 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("profiles", "readonly");
      const all = tx.objectStore("profiles").getAll();
      all.onsuccess = () => resolve(all.result);
      all.onerror = () => reject(all.error);
    };
    req.onerror = () => reject(req.error);
  });
  expect(idbProfiles).toHaveLength(1);
  const stored = idbProfiles[0] as { apiKey: { scheme: string; iv: string; ct: string } };
  expect(stored.apiKey).toBeTypeOf("object");
  expect(stored.apiKey.scheme).toBe("device");
  expect(typeof stored.apiKey.iv).toBe("string");
  expect(typeof stored.apiKey.ct).toBe("string");
  expect(JSON.stringify(stored)).not.toContain("secret-bearer-token");
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
  expect(document.querySelector('[data-testid="route-user-link-2"]')).toBeNull();
  const routeNodeText = document.querySelector('[data-testid="route-node-2"]')?.textContent ?? "";
  expect(routeNodeText).not.toContain("tagged-devices");
  expect(routeNodeText).not.toMatch(/managed by tags/i);

  await page.getByTestId("section-devices").click();
  await page.getByTestId("add-device-toggle").click();
  await expect.element(page.getByTestId("add-device-dialog")).toBeVisible();
  expect(document.querySelector('[data-testid="add-device-stepper"]')).toBeNull();
  await expect.element(page.getByTestId("add-device-options")).toBeVisible();
  await page.getByTestId("add-pending-node").click();
  await expect.element(page.getByTestId("pending-registration-flow")).toBeVisible();
  await page.getByTestId("pending-registration-user").selectOptions("1");
  await page.getByTestId("pending-node-key").fill("nodekey:pending-e2e");
  await page.getByTestId("register-pending-node").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "node.register"))
    .toBe(true);
  await expect.element(page.getByTestId("registration-result")).toBeVisible();
  await page.getByTestId("add-device-prev").click();
  await expect.element(page.getByTestId("pending-registration-flow")).toBeVisible();
  await page.getByTestId("auth-request-id").fill("auth-e2e");
  await page.getByTestId("auth-register").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "auth.register"))
    .toBe(true);
  await expect.element(page.getByTestId("registration-result")).toBeVisible();
  await page.getByTestId("add-device-prev").click();
  await page.getByTestId("auth-approve").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "auth.approve"))
    .toBe(true);
  await expect.element(page.getByTestId("registration-result")).toBeVisible();
  await page.getByTestId("add-device-prev").click();
  await page.getByTestId("auth-reject").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "auth.reject"))
    .toBe(true);
  await expect.element(page.getByTestId("registration-result")).toBeVisible();
  await page.getByTestId("add-device-finish").click();
  await page.getByTestId("add-device-toggle").click();
  await expect.element(page.getByTestId("add-device-options")).toBeVisible();
  await page.getByTestId("add-client-device").click();
  await expect.element(page.getByTestId("device-setup-flow")).toBeVisible();
  expect(
    document
      .querySelector('[data-testid="device-setup-flow"]')
      ?.closest('[data-testid="add-device-dialog"]'),
  ).toBeTruthy();
  await expect.element(page.getByTestId("setup-device-step")).toBeVisible();
  await expect.element(page.getByTestId("setup-tags")).toHaveValue("");
  await expect.element(page.getByTestId("setup-ephemeral")).toBeChecked();
  clickDomTestId("setup-ephemeral");
  await expect.element(page.getByTestId("setup-ephemeral")).not.toBeChecked();
  clickDomTestId("setup-exit-node");
  clickDomTestId("setup-tags-enabled");
  await expect.element(page.getByTestId("setup-tags")).toHaveValue("tag:server");
  await page.getByTestId("setup-tags").fill("tag:client");
  await expect.element(page.getByTestId("setup-tags")).toHaveValue("tag:client");
  await page.getByTestId("add-device-next").click();
  await expect.element(page.getByTestId("setup-auth-key-step")).toBeVisible();
  await expect.element(page.getByTestId("setup-reusable")).not.toBeChecked();
  clickDomTestId("setup-reusable");
  await expect.element(page.getByTestId("setup-reusable")).toBeChecked();
  await page.getByTestId("setup-expiration-increment").click();
  await expect.element(page.getByTestId("setup-expiration")).toHaveValue("8");
  await page.getByTestId("setup-expiration-decrement").click();
  await expect.element(page.getByTestId("setup-expiration")).toHaveValue("7");
  await page.getByTestId("setup-expiration").fill("12");
  await expect.element(page.getByTestId("setup-expiration")).toHaveValue("12");
  await page.getByTestId("add-device-step-preferences").click();
  await expect.element(page.getByTestId("setup-device-step")).toBeVisible();
  await expect.element(page.getByTestId("setup-tags")).toHaveValue("tag:client");
  await page.getByTestId("setup-manage-tags").click();
  await expect.element(page.getByTestId("device-labels-section")).toBeVisible();
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
    await expect.element(page.getByTestId("add-device-dialog")).toBeVisible();
    await page.getByTestId("add-linux-device").click();
    await page.getByTestId("add-device-next").click();
    await page.getByTestId("add-device-next").click();
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
  await page.getByTestId("profile-option-new").click();
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
  await page.getByTestId("member-actions-trigger-mobile-mobile").click();
  await page.getByTestId("rename-member-mobile-mobile").click();
  await expect.element(page.getByTestId("rename-member-dialog")).toBeVisible();
  await page.getByTestId("rename-member-cancel").click();
  await page.getByTestId("member-actions-trigger-mobile-mobile").click();
  await page.getByTestId("view-member-details-mobile-mobile").click();
  await expect.element(page.getByTestId("user-detail-dialog")).toHaveTextContent("mobile");
  await closeLayerWithEscape("user-detail-dialog");
  await page.getByTestId("member-actions-trigger-mobile-mobile").click();
  await page.getByTestId("view-member-machines-mobile-mobile").click();
  await expect.element(page.getByTestId("device-search")).toHaveValue("mobile");
  await selectSectionTab("members");
  await page.getByTestId("member-actions-trigger-mobile-mobile").click();
  await page.getByTestId("create-invite-for-member-mobile-mobile").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  await page.getByTestId("cancel-create-invite").click();
  await page.getByTestId("member-actions-trigger-mobile-mobile").click();
  await page.getByTestId("delete-member-mobile-mobile").click();
  await expect.element(page.getByTestId("delete-member-dialog")).toBeVisible();
  await page.getByTestId("confirm-delete-member").click();
  expect(document.querySelector('[data-testid="member-mobile"]')).toBeNull();
  expectNoHorizontalOverflow();

  inputDomTestId("user-search", "charlie");
  await expect.element(page.getByTestId("member-charlie")).toBeVisible();
  await page.getByTestId("member-actions-trigger-mobile-charlie").click();
  await page.getByTestId("assign-member-groups-mobile-charlie").click();
  await expect.element(page.getByTestId("assign-user-groups-dialog")).toBeVisible();
  await page.getByTestId("assign-user-groups-cancel").click();
  await page.getByTestId("member-actions-trigger-mobile-charlie").click();
  await page.getByTestId("assign-member-tags-mobile-charlie").click();
  await expect.element(page.getByTestId("assign-user-tags-dialog")).toBeVisible();
  await page.getByTestId("assign-user-tags-cancel").click();
  inputDomTestId("user-search", "");

  await selectSectionTab("invites");
  await page.getByTestId("open-create-invite").click();
  await page.getByTestId("invite-tags").fill("tag:mobile");
  await page.getByTestId("invite-ephemeral").click();
  await page.getByTestId("create-invite").click();
  await expect.element(page.getByTestId("created-invite")).toBeVisible();
  expectNoHorizontalOverflow();

  await selectSectionTab("devices");
  if (document.querySelector('[data-testid="clear-machine-filters"]')) {
    clickDomTestId("clear-machine-filters");
  }
  await expect.element(page.getByTestId("device-1")).toBeVisible();
  await expectMachinesWorkbench();
  await page.getByTestId("device-search").fill("alice");
  clickDomTestId("machine-actions-trigger-mobile-1");
  await page.getByTestId("view-node-details-action-mobile-1").click();
  await expect.element(page.getByTestId("device-detail-dialog")).toHaveTextContent("alice-laptop");
  await closeLayerWithEscape("device-detail-dialog");
  await page.getByTestId("device-search").fill("edge");
  clickDomTestId("machine-actions-trigger-mobile-2");
  await page.getByTestId("view-node-routes-action-mobile-2").click();
  await expect.element(page.getByTestId("route-node-2")).toBeVisible();
  await selectSectionTab("devices");
  await page.getByTestId("device-search").fill("alice");
  clickDomTestId("machine-actions-trigger-mobile-1");
  await page.getByTestId("expire-node-action-mobile-1").click();
  await expect.element(page.getByTestId("expire-node-dialog")).toBeVisible();
  await page.getByTestId("expire-node-cancel").click();
  clickDomTestId("machine-actions-trigger-mobile-1");
  await page.getByTestId("remove-node-action-mobile-1").click();
  await expect.element(page.getByTestId("remove-node-dialog")).toBeVisible();
  await page.getByTestId("remove-node-cancel").click();
  clickDomTestId("machine-actions-trigger-mobile-1");
  await expect.element(page.getByTestId("machine-actions-menu-mobile-1")).toBeVisible();
  await page.getByTestId("rename-node-action-mobile-1").click();
  await expect.element(page.getByTestId("rename-node-dialog")).toBeVisible();
  await page.getByTestId("rename-node-dialog-input").fill("alice-phone");
  clickDomTestId("rename-node-confirm");
  await expect.element(page.getByTestId("device-1")).toHaveTextContent("alice-phone");
  clickDomTestId("machine-actions-trigger-mobile-1");
  await expect.element(page.getByTestId("machine-actions-menu-mobile-1")).toBeVisible();
  await page.getByTestId("edit-node-tags-action-mobile-1").click();
  await expect.element(page.getByTestId("node-tags-dialog")).toBeVisible();
  await page.getByTestId("node-tags-cancel").click();
  expectNoHorizontalOverflow();

  await selectSectionTab("routes");
  await page.getByTestId("approve-routes-2").click();
  await expect.element(page.getByTestId("approve-routes-dialog")).toBeVisible();
  await expect.element(page.getByTestId("approve-routes-target-0")).toBeVisible();
  await page.getByTestId("approve-routes-cancel").click();
  expect(
    window.__headscaleUiOperationCalls?.some((call) => call.id === "node.setApprovedRoutes"),
  ).toBe(false);
  await page.getByTestId("approve-routes-2").click();
  await expect.element(page.getByTestId("approve-routes-dialog")).toBeVisible();
  await page.getByTestId("approve-routes-confirm").click();
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
  await expect.element(page.getByTestId("teams-section")).toBeVisible();
  await expect.element(page.getByTestId("device-labels-section")).toBeVisible();
  window.__headscaleUiOperationCalls = [];
  await page.getByTestId("save-policy").click();
  await expect
    .poll(() => window.__headscaleUiOperationCalls?.some((call) => call.id === "policy.set"))
    .toBe(true);
  expectNoHorizontalOverflow();
});

test("defaults to English and supports the United Nations official languages plus Traditional Chinese", async () => {
  await renderLogin();
  await connectWithDefaults();

  await expect.element(page.getByTestId("section-devices")).toBeVisible();

  await chooseProfileMenuOption("locale-option-zh");
  await expect.element(page.getByTestId("section-devices")).toHaveTextContent("机器");
  await page.getByTestId("section-members").click();
  await expect.element(page.getByTestId("member-devices-header")).toBeVisible();
  expect(document.querySelector('[data-testid="member-devices-header"]')?.textContent?.trim()).toBe(
    "设备",
  );
  expect(document.querySelector('[data-testid="user-table"]')?.textContent).not.toContain("台设备");
  selectDomTestId("user-filter", "service");
  expect(document.querySelector('[data-testid="member-tagged-devices"]')).toBeNull();
  await expect.element(page.getByTestId("user-table")).toHaveTextContent("没有匹配筛选条件的用户");

  await chooseProfileMenuOption("locale-option-zh-Hant");
  expect(document.documentElement.lang).toBe("zh-Hant");
  expect(document.documentElement.dir).toBe("ltr");
  await expect.element(page.getByTestId("section-devices")).toHaveTextContent("機器");
  expect(document.querySelector('[data-testid="member-devices-header"]')?.textContent?.trim()).toBe(
    "裝置",
  );
  await expect
    .element(page.getByTestId("user-table"))
    .toHaveTextContent("沒有匹配篩選條件的使用者");

  const refreshLabels = {
    fr: "Actualiser les données",
    ru: "Обновить данные",
    es: "Actualizar datos",
    ar: "تحديث البيانات",
  } as const;

  for (const code of ["fr", "ru", "es", "ar"] as const) {
    await chooseProfileMenuOption(`locale-option-${code}`);
    expect(document.documentElement.lang).toBe(code);
    expect(document.querySelector('[data-testid="refresh-users"]')?.getAttribute("title")).toBe(
      refreshLabels[code],
    );
    expect(
      document.querySelector('[data-testid="refresh-users"]')?.getAttribute("aria-label"),
    ).toBe(refreshLabels[code]);
  }

  await expect.element(page.getByTestId("section-devices")).toHaveTextContent("الأجهزة");
  expect(document.documentElement.dir).toBe("rtl");

  await page.getByTestId("section-invites").click();
  await page.getByTestId("open-create-invite").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  await page.getByTestId("invite-expiration").click();
  await expect.element(page.getByTestId("invite-expiration-time-label")).toHaveTextContent("الوقت");

  const arabicHour = new Intl.NumberFormat("ar-EG", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  }).format(7);
  const hourSelect = document.querySelector<HTMLSelectElement>(
    '[data-testid="invite-expiration-hour"]',
  );
  expect(hourSelect?.getAttribute("aria-label")).toBe("الساعة");
  expect(hourSelect?.selectedOptions[0]?.textContent?.trim()).toBe(arabicHour);
  expectNoHorizontalOverflow();
});

test("adapts every main page and shared controls for Arabic RTL", async () => {
  await renderLogin();

  await page.getByTestId("locale-select").click();
  await page.getByTestId("locale-option-ar").click();
  expect(document.documentElement.lang).toBe("ar");
  expect(document.documentElement.dir).toBe("rtl");
  await expect.element(page.getByTestId("profile-picker")).toBeVisible();
  expectNoHorizontalOverflow();

  await page.getByTestId("profile-option-new").click();
  await expect.element(page.getByTestId("connection-dialog")).toBeVisible();
  const connectionHeader = document.querySelector<HTMLElement>(
    '[data-testid="connection-dialog"] [data-slot="dialog-header"]',
  );
  expect(connectionHeader).toBeTruthy();
  expectTextAlignsToStart(connectionHeader as HTMLElement);
  expect(
    document.querySelector('[data-testid="connection-dialog"] [data-slot="dialog-close"]'),
  ).toBeNull();
  await closeLayerWithEscape("connection-dialog");

  await connectWithDefaults();
  expectAppHeader();
  expectResponsiveTabMenu();
  expectNoHorizontalOverflow();

  await selectSectionTab("home");
  await expect.element(page.getByTestId("refresh-data")).toBeVisible();
  expect(document.querySelector('[data-testid="refresh-data"]')?.getAttribute("title")).toBe(
    "تحديث البيانات",
  );
  await expect.element(page.getByTestId("section-home")).toHaveTextContent("نظرة عامة");
  expectNoHorizontalOverflow();

  await selectSectionTab("devices");
  await expect.element(page.getByTestId("machines-workbench")).toBeVisible();
  await expect.element(page.getByTestId("machine-list")).toBeVisible();
  expectNativeSelectIconMirrorsInlineEnd("machine-filter");
  await page.getByTestId("device-detail-link-1").click();
  await expect.element(page.getByTestId("device-detail-dialog")).toBeVisible();
  expectDialogMirrorsInlineEnd("device-detail-dialog");
  await closeLayerWithEscape("device-detail-dialog");
  await page.getByTestId("add-device-toggle").click();
  await expect.element(page.getByTestId("add-device-dialog")).toBeVisible();
  expectDialogMirrorsInlineEnd("add-device-dialog");
  await page.getByTestId("add-client-device").click();
  await expect.element(page.getByTestId("device-setup-flow")).toBeVisible();
  expectDialogMirrorsInlineEnd("add-device-dialog");
  await page.getByTestId("add-device-next").click();
  await expect.element(page.getByTestId("setup-auth-key-step")).toBeVisible();
  expectSwitchThumbMirrorsCurrentState("setup-reusable");
  await page.getByTestId("setup-reusable").click();
  await expect.element(page.getByTestId("setup-reusable")).toBeChecked();
  expectSwitchThumbMirrorsCurrentState("setup-reusable");
  await closeLayerWithEscape("add-device-dialog");
  expectNoHorizontalOverflow();

  await selectSectionTab("members");
  await expect.element(page.getByTestId("user-table")).toBeVisible();
  expectNativeSelectIconMirrorsInlineEnd("user-filter");
  await page.getByTestId("open-create-member").click();
  await expect.element(page.getByTestId("member-create-dialog")).toBeVisible();
  expectDialogMirrorsInlineEnd("member-create-dialog");
  await closeLayerWithEscape("member-create-dialog");
  expectNoHorizontalOverflow();

  await selectSectionTab("invites");
  await expect.element(page.getByTestId("invite-table")).toBeVisible();
  expectNativeSelectIconMirrorsInlineEnd("invite-filter");
  await page.getByTestId("open-create-invite").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  expectDialogMirrorsInlineEnd("invite-create-dialog");
  await page.getByTestId("invite-expiration").click();
  expectNativeSelectIconMirrorsInlineEnd("invite-expiration-hour");
  expectNoHorizontalOverflow();
  await closeLayerWithEscape("invite-create-dialog");

  await selectSectionTab("routes");
  await expect.element(page.getByTestId("route-node-2")).toBeVisible();
  await page.getByTestId("approve-route-2-0").click();
  await expect.element(page.getByTestId("approve-route-dialog")).toBeVisible();
  const alertHeader = document.querySelector<HTMLElement>('[data-slot="alert-dialog-header"]');
  expect(alertHeader).toBeTruthy();
  expectTextAlignsToStart(alertHeader as HTMLElement);
  await page.getByTestId("approve-route-cancel").click();
  expectNoHorizontalOverflow();

  await selectSectionTab("access");
  await expect.element(page.getByTestId("device-labels-section")).toBeVisible();
  await page.getByTestId("new-device-label").click();
  await expect.element(page.getByTestId("tag-detail-dialog")).toBeVisible();
  expectDialogMirrorsInlineEnd("tag-detail-dialog");
  await closeLayerWithEscape("tag-detail-dialog");
  expectNoHorizontalOverflow();

  await page.viewport(390, 844);
  expectResponsiveTabMenu();
  for (const section of ["home", "devices", "members", "invites", "routes", "access"] as const) {
    await selectSectionTab(section);
    expectNoHorizontalOverflow();
  }
});

test("mirrors the access policy workspace in Arabic", async () => {
  await renderLogin();
  await connectWithDefaults();

  await chooseProfileMenuOption("locale-option-ar");
  await selectSectionTab("access");
  await expect.element(page.getByTestId("teams-section")).toBeVisible();
  await expect.element(page.getByTestId("device-labels-section")).toBeVisible();

  expect(document.documentElement.lang).toBe("ar");
  expect(document.documentElement.dir).toBe("rtl");

  const teams = document.querySelector<HTMLElement>('[data-testid="teams-section"]');
  const labels = document.querySelector<HTMLElement>('[data-testid="device-labels-section"]');
  expect(teams).toBeTruthy();
  expect(labels).toBeTruthy();

  const teamsRect = teams?.getBoundingClientRect();
  const labelsRect = labels?.getBoundingClientRect();
  expect(teamsRect?.bottom ?? 0).toBeLessThanOrEqual((labelsRect?.top ?? 0) + 1);
  expect(Math.abs((teamsRect?.left ?? 0) - (labelsRect?.left ?? 0))).toBeLessThan(2);
  expect(Math.abs((teamsRect?.right ?? 0) - (labelsRect?.right ?? 0))).toBeLessThan(2);
  expectNoHorizontalOverflow();

  await page.viewport(390, 844);
  await expect.element(page.getByTestId("device-labels-section")).toBeVisible();
  expectNoHorizontalOverflow();
});

test("supports light, dark and system theme modes", async () => {
  await renderLogin();
  await connectWithDefaults();

  const seenThemes = new Set<string>();
  for (const mode of ["light", "dark", "auto"]) {
    await chooseProfileMenuOption(`theme-option-${mode}`);
    const theme = await readIdbSetting("theme");
    if (theme) {
      seenThemes.add(theme);
    }
    if (mode === "dark") {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    }
  }

  expect(seenThemes).toEqual(new Set(["light", "dark", "auto"]));
});

test("uses a Tailscale-style add device setup dialog", async () => {
  await renderLogin();
  await connectWithDefaults();

  await page.getByTestId("section-devices").click();
  await expectMachinesWorkbench();
  await page.getByTestId("add-device-toggle").click();
  await expect.element(page.getByTestId("add-device-dialog")).toBeVisible();
  expect(document.querySelector('[data-testid="add-device-stepper"]')).toBeNull();
  await expect.element(page.getByTestId("add-device-options")).toBeVisible();
  await page.getByTestId("add-linux-device").click();

  await expect.element(page.getByTestId("device-setup-flow")).toBeVisible();
  await expect.element(page.getByTestId("add-device-stepper")).toBeVisible();
  expect(
    document
      .querySelector('[data-testid="device-setup-flow"]')
      ?.closest('[data-testid="add-device-dialog"]'),
  ).toBeTruthy();
  await expect.element(page.getByTestId("setup-device-step")).toBeVisible();
  await expect.element(page.getByTestId("setup-tags")).toHaveValue("tag:server");
  expect(document.querySelector('[data-testid="setup-auth-key-step"]')).toBeNull();
  await page.getByTestId("add-device-next").click();
  await expect.element(page.getByTestId("setup-auth-key-step")).toBeVisible();
  await expect.element(page.getByTestId("setup-reusable")).toBeChecked();
  await page.getByTestId("add-device-next").click();
  await expect.element(page.getByTestId("setup-generate-step")).toBeVisible();

  await page.getByTestId("generate-install-script").click();
  await expect.element(page.getByTestId("invite-create-dialog")).toBeVisible();
  await page.getByTestId("create-invite").click();
  await expect.element(page.getByTestId("created-invite")).toHaveTextContent("tailscale up");

  await page.getByTestId("add-device-finish").click();
  await expectMachinesWorkbench();
});
