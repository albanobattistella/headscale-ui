<script setup lang="ts">
import {
  Activity,
  Check,
  CircleUserRound,
  Clock,
  Copy,
  Download,
  EllipsisVertical,
  FileCheck2,
  Filter,
  KeyRound,
  Languages,
  LoaderCircle,
  LogOut,
  MonitorCog,
  MoonStar,
  Network,
  Pencil,
  Plus,
  Router,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  SunMedium,
  Trash2,
  Users,
  Wifi,
  WifiHigh,
  WifiLow,
  WifiOff,
  WifiZero,
} from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { RestHeadscaleClient } from "@/api/headscale-client";
import type { ConnectionSettings } from "@/api/http";
import { MockHeadscaleClient } from "@/api/mock-headscale-client";
import type {
  ApiKey,
  HeadscaleClient,
  HeadscaleNode,
  HeadscaleSnapshot,
  HeadscaleUser,
  PreAuthKey,
} from "@/api/types";
import CreateAuthKeyDialog from "@/components/CreateAuthKeyDialog.vue";
import type {
  AuthKeyDialogDefaults,
  AuthKeyDialogLabels,
  AuthKeyDialogPayload,
} from "@/components/create-auth-key-dialog";
import HeadscaleLogo from "@/components/HeadscaleLogo.vue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isTimestampExpired as isExpired, nodeConnectionStatus } from "@/domain/node-status";
import { LOCALE_META, type Locale, SUPPORTED_LOCALES, useHeadscaleI18n } from "@/i18n";
import { toTraditionalChineseValue } from "@/i18n/traditional";
import {
  type ConnectionProfile,
  createBrowserProfileStorageProvider,
  type ProfileStorageScope,
} from "@/lib/profile-storage";

const { t, locale, meta, setLocale } = useHeadscaleI18n();
const themeStorageKey = "headscale-ui-theme";
const newProfileId = "__new__";
const localMockBaseUrl = "http://127.0.0.1:8080";
const profileStorage = createBrowserProfileStorageProvider();
type ThemeMode = "light" | "dark" | "auto";
type ProductSection = "home" | "devices" | "members" | "invites" | "routes" | "access";
type MachineFilter = "all" | "online" | "offline" | "expired" | "routes" | "tagged";
type UserFilter = "all" | "owner" | "member" | "service";
type InviteFilter = "all" | "ready" | "used" | "expired" | "tagged";
type AddDeviceTask = "server" | "client" | "pending";
type AddDeviceStep = "type" | "preferences" | "authKey" | "generate" | "pending" | "result";
type ProfileSubmenu = "language" | "theme";
type ServerSettingsTab = "apiKeys" | "maintenance";
type ServerSignalStrength = "strong" | "good" | "weak" | "poor" | "offline";
type RouteApprovalTarget = {
  node: HeadscaleNode;
  route: string;
};
type ApiKeyActionTarget = {
  kind: "expire" | "delete";
  key: ApiKey;
};
type InviteActionTarget = {
  kind: "expire" | "delete";
  key: PreAuthKey;
};
type PolicyBuilderSlot = "source" | "destination" | "ports";
type PolicyWorkspaceTab = "rules" | "groups" | "tags" | "review";
type PolicyRule = {
  id: string;
  action: "accept";
  source: string;
  destination: string;
  ports: string;
};
type PolicyGroup = {
  id: string;
  name: string;
  members: string;
};
type PolicyTagOwner = {
  id: string;
  tag: string;
  owners: string;
};
type PolicyRemovalTarget = {
  kind: "rule" | "group" | "tagOwner";
  id: string;
  label: string;
};
type PolicyChoice = {
  id: string;
  slot: PolicyBuilderSlot;
  label: string;
  value: string;
  description: string;
};
type PolicyListChoice = {
  id: string;
  label: string;
  value: string;
  description: string;
};
const themeModes: ThemeMode[] = ["light", "dark", "auto"];
const apiKeyCommand = "headscale apikeys create --expiration 90d";
const headscaleRemoteCliDocsUrl = "https://docs.headscale.org/ref/remote-cli/";
const profileLoginMinimumMs = 300;
const productSections: ProductSection[] = [
  "home",
  "devices",
  "members",
  "invites",
  "routes",
  "access",
];

type ConnectionForm = ConnectionSettings & {
  profileId: string;
  profileName: string;
  remember: boolean;
};

const englishCopy = {
  nav: {
    home: "Overview",
    devices: "Machines",
    members: "Users",
    invites: "Auth keys",
    routes: "Routes",
    access: "Access controls",
  },
  dashboardTitle: "Tailnet overview",
  dashboardSubtitle: "A home base for devices, people and private routes.",
  onlineDevices: "Online devices",
  totalDevices: "Total devices",
  openInvites: "Open invites",
  advertisedRoutes: "Advertised routes",
  currentServer: "Current server",
  serverReady: "Server ready",
  serverIssue: "Server issue",
  reviewRoutes: "Review routes",
  recentDevices: "Recent machines",
  devicesTitle: "Machines",
  devicesSubtitle: "Manage the devices connected to your tailnet.",
  learnMore: "Learn more",
  searchDevices: "Search by name, owner, tag, version...",
  noDevices: "No machines match these filters.",
  addFirstDevice: "Add your first device",
  addFirstDeviceDescription:
    "Install Tailscale on another device and connect it to this Headscale server.",
  addDevice: "Add device",
  addLinuxServerTitle: "Add Linux server",
  addClientDeviceTitle: "Add client device",
  pendingRegistrationTitle: "Register pending device",
  wizardStepPreferencesDescription: "Set tags and lifecycle behavior for the device.",
  wizardStepAuthKeyDescription: "Choose how the authentication key behaves.",
  wizardStepGenerateDescription: "Create the key and copy the install command.",
  wizardStepPendingDescription: "Register or review a device that is waiting.",
  wizardStepResultDescription: "Review the result and continue.",
  wizardResult: "Result",
  nextStep: "Next",
  previousStep: "Back",
  finish: "Done",
  deviceSetupLead: "Select preferences for your device to generate an install command.",
  pendingRegistrationDescription:
    "Use the registration key or auth ID shown by a device waiting for approval.",
  pendingNode: "Pending node key",
  pendingNodeDescription: "Paste the node registration key from the Tailscale client.",
  registrationRequest: "Browser auth request",
  registrationRequestDescription:
    "For newer Headscale auth flows, paste the auth ID and approve or reject the request.",
  registerPendingNode: "Register pending node",
  registerAuthRequest: "Register auth request",
  approveAuthRequest: "Approve request",
  rejectAuthRequest: "Reject request",
  nodeRegistrationKey: "Registration key",
  nodeRegistrationKeyPlaceholder: "nodekey:...",
  authId: "Auth ID",
  authIdPlaceholder: "auth request id",
  registeredNode: "Registered machine",
  setupDevice: "Set up device",
  setupAuthKey: "Set up authentication key",
  generateInstallScript: "Generate install script",
  generate: "Generate",
  manageTags: "Manage tags in Access controls",
  devicePreferences: "Device preferences",
  useTagsDescription:
    "Authenticate and control access to the device using tags. Tagged servers do not need frequent key expiry.",
  ephemeralDescription: "Automatically remove the device from your tailnet when it goes offline.",
  exitNodeDescription: "Route traffic through this device on your network.",
  reusableDescription: "Use this key to authenticate more than one device.",
  authKeyAutomationHint: "Use this as part of automation to set up multiple devices.",
  authKeyExpirationDescription:
    "Set a short time window for authenticating this device. Existing devices keep their own expiry.",
  keyExpiryHint: "Keep auth keys short-lived unless you are automating repeat installs.",
  days: "days",
  mustBeBetweenDays: "Must be between 1 and 90 days.",
  devicesTableMachine: "Machine",
  devicesTableUser: "User",
  devicesTableRoutes: "Routes",
  devicesTableActivity: "Activity",
  linuxServer: "Linux server",
  linuxServerDescription: "Services running on VMs, containers and routers.",
  clientDevice: "Client device",
  clientDeviceDescription: "User-owned laptops, phones and desktops.",
  filters: "Filters",
  exportData: "Export data",
  clearFilters: "Clear filters",
  allMachines: "All machines",
  onlineOnly: "Online",
  offlineOnly: "Offline",
  expiredOnly: "Expired",
  routeAdvertisers: "Advertises routes",
  taggedOnly: "Tagged",
  owner: "Owner",
  addresses: "Addresses",
  tags: "Tags",
  editTags: "Edit tags",
  editNodeTagsTitle: "Edit machine tags",
  editNodeTagsDescription:
    "Headscale replaces the full tag list. Keep every tag that should stay on this machine.",
  nodeTags: "Machine tags",
  replaceTagsWarning: "Saving replaces the current tags instead of appending to them.",
  saveTags: "Save tags",
  routes: "Routes",
  lastSeen: "Last seen",
  expires: "Expires",
  status: "Status",
  actions: "Actions",
  details: "Details",
  viewDetails: "View details",
  viewMachines: "View machines",
  viewRoutes: "View routes",
  machineDetails: "Machine details",
  userDetails: "User details",
  nodeId: "Node ID",
  userId: "User ID",
  registerMethod: "Register method",
  personalDevices: "Personal machines",
  activeAuthKeys: "Active auth keys",
  policyReferences: "Policy references",
  noPersonalDevices: "No personal machines.",
  noPolicyReferences: "No policy references.",
  unknown: "Unknown",
  pendingRoutes: "Pending routes",
  exitRoute: "Exit route",
  rename: "Rename",
  renameMachineTitle: "Rename machine",
  renameMachineDescription: "Change the machine name shown in Headscale.",
  machineName: "Machine name",
  saveName: "Save name",
  expire: "Expire",
  expireMachineTitle: "Expire machine",
  expireMachineDescription:
    "This will force the machine to re-authenticate before it can connect again.",
  confirmExpire: "Expire machine",
  remove: "Remove",
  removeMachineTitle: "Remove machine",
  removeMachineDescription:
    "This removes the machine from Headscale and cannot be undone from this UI.",
  confirmRemove: "Remove machine",
  cancel: "Cancel",
  membersTitle: "Users",
  membersSubtitle: "Manage the users in your network and their permissions.",
  inviteUsers: "Invite users",
  inviteUsersDescription: "Create a user and generate an auth key for their first device.",
  approvalRequired: "Approval is required",
  approvalRequiredDescription: "New routes and privileged tags require an admin review.",
  addMember: "Add user",
  searchUsers: "Search users...",
  allUsers: "All users",
  owners: "Owners",
  members: "Members",
  serviceAccounts: "Service accounts",
  role: "Role",
  joined: "Joined",
  authSource: "Auth source",
  memberName: "User name",
  displayName: "Display name",
  email: "Email",
  createMember: "Create user",
  deviceCount: "devices",
  memberDevices: "Devices",
  deleteMember: "Delete user",
  renameMember: "Rename user",
  renameMemberTitle: "Rename user",
  renameMemberDescription: "Change the Headscale username used for this account.",
  saveMemberName: "Save user name",
  deleteMemberTitle: "Delete user",
  deleteMemberDescription:
    "This removes the user from Headscale. Review their machines and auth keys before continuing.",
  confirmDeleteMember: "Delete user",
  noUsersMatch: "No users match these filters.",
  invitesTitle: "Auth keys",
  invitesSubtitle: "Create keys that let machines join without exposing server internals.",
  searchAuthKeys: "Search keys, owners or tags...",
  inviteOwner: "Owner",
  noUsers: "No users available",
  inviteExpiration: "Expiration",
  time: "Time",
  hour: "Hour",
  minute: "Minute",
  reusable: "Reusable",
  ephemeral: "Ephemeral device",
  aclTags: "Device tags",
  createInvite: "Create auth key",
  inviteKey: "Auth key",
  copyCommand: "Copy command",
  installCommand: "Install command",
  oneTimeKey: "One-time key",
  readyKeys: "Ready keys",
  taggedKeys: "Tagged keys",
  used: "Used",
  unused: "Ready",
  expireInvite: "Expire key",
  deleteInvite: "Delete key",
  expireInviteTitle: "Expire auth key",
  expireInviteDescription: "This key will stop accepting new machines.",
  deleteInviteTitle: "Delete auth key",
  deleteInviteDescription: "This removes the auth key from Headscale.",
  confirmExpireInvite: "Expire key",
  confirmDeleteInvite: "Delete key",
  noAuthKeys: "No auth keys match these filters.",
  routesTitle: "Routes",
  routesSubtitle: "Review subnet and exit routes before making them available to users.",
  approvedRoutes: "Approved routes",
  availableRoutes: "Available routes",
  viewMachine: "View machine",
  viewUser: "View user",
  approveRoute: "Approve route",
  approveRouteTitle: "Approve route",
  approveRouteDescription:
    "Only this route will be approved. Existing approved routes stay enabled.",
  approveExitRouteTitle: "Approve exit route",
  approveExitRouteDescription:
    "Exit routes can carry internet-bound traffic through this machine. Confirm that this server should be trusted for that path.",
  approveAll: "Approve all",
  approveRoutesTitle: "Approve advertised routes",
  approveRoutesDescription: "This approves every currently advertised route for this machine.",
  approveExitRoutesTitle: "Approve exit routes",
  approveExitRoutesDescription:
    "This includes exit routes, which can carry internet-bound traffic through this machine.",
  confirmApproveRoutes: "Approve routes",
  routesApproved: "Approved",
  noRoutes: "No advertised routes are waiting for review.",
  noRouteValues: "None",
  accessTitle: "Access controls",
  accessSubtitle: "Design ACLs, groups and tag ownership without editing raw JSON.",
  policyDesigner: "Policy designer",
  ruleBuilder: "Access rule builder",
  source: "From",
  destination: "To",
  ports: "Service",
  policyObjectPicker: "Choose objects from the menus",
  policyDropHint: "Select from the menu",
  selectedRule: "Selected rule",
  sourceChoices: "People and groups",
  destinationChoices: "Devices and tags",
  serviceChoices: "Services",
  anySource: "Everyone",
  anySourceDescription: "All users, groups and tagged devices",
  anyDestination: "All devices",
  anyDestinationDescription: "Every device in this tailnet",
  anyService: "All services",
  anyServiceDescription: "All ports",
  userChoiceDescription: "User account",
  groupChoiceDescription: "Saved group",
  tagChoiceDescription: "Tagged devices",
  deviceChoiceDescription: "Specific machine address",
  serviceSsh: "SSH",
  serviceHttps: "HTTPS",
  serviceDns: "DNS",
  serviceSshDescription: "Port 22",
  serviceHttpsDescription: "Port 443",
  serviceDnsDescription: "Port 53",
  policyRulePreview: "Rule preview",
  allowTraffic: "Allow traffic",
  addRule: "Add rule",
  groups: "Groups",
  groupName: "Group name",
  groupMembers: "Members",
  groupMemberPicker: "Choose users from the menu and add them to this group.",
  selectedMembers: "Selected members",
  selectGroupMember: "Select member",
  addSelectedMember: "Add member",
  addGroup: "Add group",
  tagOwners: "Tag owners",
  tagName: "Tag",
  ownersList: "Owners",
  tagOwnerPicker: "Choose users or groups from the menu and grant this tag.",
  selectedOwners: "Selected owners",
  selectTagOwner: "Select owner",
  addSelectedOwner: "Add owner",
  addTagOwner: "Add tag owner",
  removeItem: "Remove",
  confirmRemovePolicyItemTitle: "Remove this access control item?",
  confirmRemovePolicyItemDescription:
    "This removes it from the visual policy draft. Save the policy to apply the change.",
  safetyReview: "Safety review",
  readyToSave: "Ready to save",
  policyWarningOpenAccess: "A rule currently allows every source to reach every destination.",
  policyWarningExitRoute: "Exit-node routes require an explicit review before approval.",
  policySummary: "Policy summary",
  policy: "Policy",
  savePolicy: "Save policy",
  policyWorkspaceSummary:
    "Rules are shown as plain sentences. Advanced policy sections stay preserved when you save.",
  policyRulesTab: "Access rules",
  policyGroupsTab: "Groups",
  policyTagOwnersTab: "Tag access",
  policyReviewTab: "Review",
  policyOverviewRules: "Rules",
  policyOverviewGroups: "Groups",
  policyOverviewTags: "Tag access",
  policyOverviewWarnings: "Warnings",
  policyQuickStartTitle: "Create an access rule",
  policyQuickStartDescription: "Choose who can access which devices and services. No JSON needed.",
  policyWhoCanAccess: "Who can access",
  policyWhatCanAccess: "What they can access",
  policyWhichService: "Which service",
  policySimplePreview: "Plain-language preview",
  policyAdvancedPicker: "Menu choices",
  policyAdvancedPickerDescription:
    "Use the dropdown menus above to build rules without editing JSON.",
  searchPolicyRules: "Search rules...",
  searchPolicyGroups: "Search groups...",
  searchPolicyTagOwners: "Search tag access...",
  existingRules: "Current access rules",
  noPolicyRules: "No access rules yet.",
  noPolicyGroups: "No groups match.",
  noPolicyTagOwners: "No tag access entries match.",
  highRisk: "High risk",
  reviewNeeded: "Review needed",
  noPolicyWarnings: "No blocking issues found.",
  preservedPolicySections: "Preserved advanced sections",
  preservedPolicySectionsDescription:
    "These policy sections are not edited here, but they remain in the saved policy.",
  noPreservedPolicySections: "No extra policy sections.",
  policyRulesTableRule: "Rule",
  policyRulesTableSource: "Who",
  policyRulesTableDestination: "Device or tag",
  policyRulesTableService: "Service",
  policyRulesTableRisk: "Risk",
  policyRulesTableActions: "Actions",
  copied: "Copied",
  copy: "Copy",
  openServerSettings: "Server settings",
  serverSettingsTitle: "Server settings",
  serverSettingsDescription: "Manage server-scoped credentials and maintenance actions.",
  apiKeysTitle: "API keys",
  apiKeysDescription:
    "API keys can control this Headscale server. The full key is only shown once.",
  apiKeyPrefix: "Prefix",
  createdApiKey: "Created API key",
  apiKeyOnlyShownOnce: "Copy it now. Headscale will not return the full key again.",
  createApiKeyTitle: "Create API key",
  apiKeyExpiration: "API key expiration",
  expireApiKeyTitle: "Expire API key",
  deleteApiKeyTitle: "Delete API key",
  confirmExpireApiKey: "Expire API key",
  confirmDeleteApiKey: "Delete API key",
  maintenance: "Maintenance",
  maintenanceDescription:
    "These actions are server-wide. Use them only when repairing or validating Headscale state.",
  backfillNodeIps: "Backfill node IPs",
  backfillNodeIpsDescription: "Run Headscale's global node IP backfill maintenance action.",
  confirmBackfillNodeIps: "Run backfill",
  backfillResult: "Backfill result",
  refreshData: "Refresh data",
  lastUpdated: "Last updated",
} as const;

type ProductCopy = typeof englishCopy;
type SourceLocale = Exclude<Locale, "zh-Hant">;

const productCopyBase = {
  en: englishCopy,
  zh: {
    nav: {
      home: "概览",
      devices: "机器",
      members: "用户",
      invites: "认证密钥",
      routes: "路由",
      access: "访问控制",
    },
    dashboardTitle: "Tailnet 概览",
    dashboardSubtitle: "集中管理设备、成员和私有路由。",
    onlineDevices: "在线设备",
    totalDevices: "全部设备",
    openInvites: "可用邀请",
    advertisedRoutes: "待审路由",
    currentServer: "当前服务器",
    serverReady: "服务正常",
    serverIssue: "服务异常",
    reviewRoutes: "审核路由",
    recentDevices: "最近机器",
    devicesTitle: "机器",
    devicesSubtitle: "管理已经接入这个 tailnet 的设备。",
    learnMore: "了解更多",
    searchDevices: "按名称、归属、标签、版本搜索...",
    noDevices: "没有匹配这些筛选条件的机器。",
    addFirstDevice: "添加第一台设备",
    addFirstDeviceDescription: "在另一台设备安装 Tailscale，并连接到这个 Headscale 服务器。",
    addDevice: "添加设备",
    addLinuxServerTitle: "添加 Linux 服务器",
    addClientDeviceTitle: "添加客户端设备",
    pendingRegistrationTitle: "注册待审批设备",
    wizardStepPreferencesDescription: "设置设备标签和生命周期行为。",
    wizardStepAuthKeyDescription: "选择认证密钥的使用方式。",
    wizardStepGenerateDescription: "创建密钥并复制安装命令。",
    wizardStepPendingDescription: "注册或审核正在等待的设备。",
    wizardStepResultDescription: "检查执行结果并继续。",
    wizardResult: "结果",
    nextStep: "下一步",
    previousStep: "上一步",
    finish: "完成",
    deviceSetupLead: "选择设备偏好，然后生成安装命令。",
    pendingRegistrationDescription: "使用等待审批设备显示的 registration key 或 auth ID。",
    pendingNode: "待注册节点密钥",
    pendingNodeDescription: "粘贴 Tailscale 客户端显示的节点注册密钥。",
    registrationRequest: "浏览器认证请求",
    registrationRequestDescription:
      "新版 Headscale 认证流程可以粘贴 auth ID，然后批准或拒绝该请求。",
    registerPendingNode: "注册待审批节点",
    registerAuthRequest: "注册认证请求",
    approveAuthRequest: "批准请求",
    rejectAuthRequest: "拒绝请求",
    nodeRegistrationKey: "注册密钥",
    nodeRegistrationKeyPlaceholder: "nodekey:...",
    authId: "Auth ID",
    authIdPlaceholder: "认证请求 ID",
    registeredNode: "已注册机器",
    setupDevice: "设置设备",
    setupAuthKey: "设置认证密钥",
    generateInstallScript: "生成安装脚本",
    generate: "生成",
    manageTags: "在访问控制中管理标签",
    devicePreferences: "设备偏好",
    useTagsDescription: "使用标签认证并控制设备访问权限。带标签服务器不需要频繁处理节点密钥过期。",
    ephemeralDescription: "设备离线后自动从 tailnet 移除。",
    exitNodeDescription: "让网络流量通过这台设备转发。",
    reusableDescription: "使用这个密钥认证多台设备。",
    authKeyAutomationHint: "适合自动化场景下批量接入多台设备。",
    authKeyExpirationDescription: "设置认证这台设备的短期时间窗口。已接入设备保留自己的过期时间。",
    keyExpiryHint: "除非用于自动化批量安装，否则认证密钥应尽量短期有效。",
    days: "天",
    mustBeBetweenDays: "必须在 1 到 90 天之间。",
    devicesTableMachine: "机器",
    devicesTableUser: "用户",
    devicesTableRoutes: "路由",
    devicesTableActivity: "活动",
    linuxServer: "Linux 服务器",
    linuxServerDescription: "运行在虚拟机、容器和路由器上的服务。",
    clientDevice: "客户端设备",
    clientDeviceDescription: "用户自己的电脑、手机和桌面设备。",
    filters: "筛选",
    exportData: "导出数据",
    clearFilters: "清除筛选",
    allMachines: "全部机器",
    onlineOnly: "在线",
    offlineOnly: "离线",
    expiredOnly: "已过期",
    routeAdvertisers: "公布路由",
    taggedOnly: "带标签",
    owner: "归属",
    addresses: "地址",
    tags: "标签",
    editTags: "编辑标签",
    editNodeTagsTitle: "编辑机器标签",
    editNodeTagsDescription: "Headscale 会替换完整标签列表。需要保留的标签也要留在这里。",
    nodeTags: "机器标签",
    replaceTagsWarning: "保存会替换当前标签，而不是追加标签。",
    saveTags: "保存标签",
    routes: "路由",
    lastSeen: "最后在线",
    expires: "过期时间",
    status: "状态",
    actions: "操作",
    details: "详情",
    viewDetails: "查看详情",
    viewMachines: "查看机器",
    viewRoutes: "查看路由",
    machineDetails: "机器详情",
    userDetails: "用户详情",
    nodeId: "节点 ID",
    userId: "用户 ID",
    registerMethod: "注册方式",
    personalDevices: "个人机器",
    activeAuthKeys: "有效认证密钥",
    policyReferences: "策略引用",
    noPersonalDevices: "没有个人机器。",
    noPolicyReferences: "没有策略引用。",
    unknown: "未知",
    pendingRoutes: "待审路由",
    exitRoute: "出口路由",
    rename: "重命名",
    renameMachineTitle: "重命名机器",
    renameMachineDescription: "修改 Headscale 中显示的机器名称。",
    machineName: "机器名称",
    saveName: "保存名称",
    expire: "设为过期",
    expireMachineTitle: "使机器过期",
    expireMachineDescription: "这会要求该机器重新认证后才能再次连接。",
    confirmExpire: "确认过期",
    remove: "移除",
    removeMachineTitle: "移除机器",
    removeMachineDescription: "这会从 Headscale 移除该机器，此操作无法在当前 UI 中撤销。",
    confirmRemove: "确认移除",
    cancel: "取消",
    membersTitle: "用户",
    membersSubtitle: "管理网络中的用户和他们的权限。",
    inviteUsers: "邀请用户",
    inviteUsersDescription: "创建用户，并为他们的第一台设备生成认证密钥。",
    approvalRequired: "需要审批",
    approvalRequiredDescription: "新路由和高权限标签需要管理员审核。",
    addMember: "添加用户",
    searchUsers: "搜索用户...",
    allUsers: "全部用户",
    owners: "Owner",
    members: "成员",
    serviceAccounts: "服务账号",
    role: "角色",
    joined: "加入时间",
    authSource: "认证来源",
    memberName: "用户名",
    displayName: "显示名称",
    email: "邮箱",
    createMember: "创建用户",
    deviceCount: "设备",
    memberDevices: "设备",
    deleteMember: "删除用户",
    renameMember: "重命名用户",
    renameMemberTitle: "重命名用户",
    renameMemberDescription: "修改这个账号在 Headscale 中使用的用户名。",
    saveMemberName: "保存用户名",
    deleteMemberTitle: "删除用户",
    deleteMemberDescription: "这会从 Headscale 删除该用户。继续前请检查他的机器和认证密钥。",
    confirmDeleteMember: "删除用户",
    noUsersMatch: "没有匹配筛选条件的用户。",
    invitesTitle: "认证密钥",
    invitesSubtitle: "生成让机器入网的密钥，不需要暴露服务端细节。",
    searchAuthKeys: "搜索密钥、归属或标签...",
    inviteOwner: "归属成员",
    noUsers: "没有可用用户",
    inviteExpiration: "过期时间",
    time: "时间",
    hour: "小时",
    minute: "分钟",
    reusable: "可重复使用",
    ephemeral: "临时设备",
    aclTags: "设备标签",
    createInvite: "创建认证密钥",
    inviteKey: "认证密钥",
    copyCommand: "复制命令",
    installCommand: "安装命令",
    oneTimeKey: "一次性密钥",
    readyKeys: "可用密钥",
    taggedKeys: "带标签密钥",
    used: "已使用",
    unused: "可使用",
    expireInvite: "使密钥过期",
    deleteInvite: "删除密钥",
    expireInviteTitle: "使认证密钥过期",
    expireInviteDescription: "这个密钥将不再接受新机器接入。",
    deleteInviteTitle: "删除认证密钥",
    deleteInviteDescription: "这会从 Headscale 删除该认证密钥。",
    confirmExpireInvite: "使密钥过期",
    confirmDeleteInvite: "删除密钥",
    noAuthKeys: "没有匹配筛选条件的认证密钥。",
    routesTitle: "路由",
    routesSubtitle: "先审核子网路由和出口路由，再开放给用户。",
    approvedRoutes: "已批准路由",
    availableRoutes: "待批准路由",
    viewMachine: "查看机器",
    viewUser: "查看用户",
    approveRoute: "批准此路由",
    approveRouteTitle: "批准路由",
    approveRouteDescription: "只会批准当前这一条路由，并保留这台机器已有的已批准路由。",
    approveExitRouteTitle: "批准出口路由",
    approveExitRouteDescription: "出口路由可能承载公网流量，请确认这台机器适合作为该路径的出口。",
    approveAll: "全部批准",
    approveRoutesTitle: "批准公布路由",
    approveRoutesDescription: "这会批准这台机器当前公布的全部路由。",
    approveExitRoutesTitle: "批准出口路由",
    approveExitRoutesDescription: "其中包含出口路由，可能会让公网流量经过这台机器。",
    confirmApproveRoutes: "批准路由",
    routesApproved: "已批准",
    noRoutes: "当前没有待审核路由。",
    noRouteValues: "无",
    accessTitle: "访问控制",
    accessSubtitle: "用友好的 UI 设计 ACL、用户组和标签归属，不需要编辑原始 JSON。",
    policyDesigner: "策略设计器",
    ruleBuilder: "访问规则设计",
    source: "来源",
    destination: "目标",
    ports: "服务",
    policyObjectPicker: "从菜单中选择对象",
    policyDropHint: "从菜单中选择",
    selectedRule: "当前规则",
    sourceChoices: "成员和用户组",
    destinationChoices: "设备和标签",
    serviceChoices: "服务",
    anySource: "所有来源",
    anySourceDescription: "所有用户、用户组和带标签设备",
    anyDestination: "所有设备",
    anyDestinationDescription: "这个 tailnet 中的所有设备",
    anyService: "所有服务",
    anyServiceDescription: "所有端口",
    userChoiceDescription: "用户账号",
    groupChoiceDescription: "已保存用户组",
    tagChoiceDescription: "带标签设备",
    deviceChoiceDescription: "指定机器地址",
    serviceSsh: "SSH",
    serviceHttps: "HTTPS",
    serviceDns: "DNS",
    serviceSshDescription: "端口 22",
    serviceHttpsDescription: "端口 443",
    serviceDnsDescription: "端口 53",
    policyRulePreview: "规则预览",
    allowTraffic: "允许访问",
    addRule: "添加规则",
    groups: "用户组",
    groupName: "用户组名称",
    groupMembers: "成员",
    groupMemberPicker: "从菜单中选择用户，并添加到这个用户组。",
    selectedMembers: "已选择成员",
    selectGroupMember: "选择成员",
    addSelectedMember: "添加成员",
    addGroup: "添加用户组",
    tagOwners: "标签归属",
    tagName: "标签",
    ownersList: "归属者",
    tagOwnerPicker: "从菜单中选择用户或用户组，并授予这个标签。",
    selectedOwners: "已选择归属者",
    selectTagOwner: "选择归属者",
    addSelectedOwner: "添加归属者",
    addTagOwner: "添加标签归属",
    removeItem: "移除",
    confirmRemovePolicyItemTitle: "移除这个访问控制项？",
    confirmRemovePolicyItemDescription: "这会从可视化策略草稿中移除它。保存策略后才会应用变更。",
    safetyReview: "安全检查",
    readyToSave: "可以保存",
    policyWarningOpenAccess: "当前有规则允许所有来源访问所有目标。",
    policyWarningExitRoute: "出口路由需要在批准前单独审核。",
    policySummary: "策略摘要",
    policy: "访问策略",
    savePolicy: "保存策略",
    policyWorkspaceSummary: "规则会用人话展示；保存时会保留未在这里编辑的高级策略段。",
    policyRulesTab: "访问规则",
    policyGroupsTab: "用户组",
    policyTagOwnersTab: "标签授权",
    policyReviewTab: "检查",
    policyOverviewRules: "规则",
    policyOverviewGroups: "用户组",
    policyOverviewTags: "标签授权",
    policyOverviewWarnings: "风险",
    policyQuickStartTitle: "创建一条访问规则",
    policyQuickStartDescription: "选择谁可以访问哪些设备和服务，不需要写 JSON。",
    policyWhoCanAccess: "谁可以访问",
    policyWhatCanAccess: "访问哪些设备",
    policyWhichService: "允许哪些服务",
    policySimplePreview: "人话预览",
    policyAdvancedPicker: "菜单选择",
    policyAdvancedPickerDescription: "使用上方下拉菜单创建规则，不需要编辑 JSON。",
    searchPolicyRules: "搜索规则...",
    searchPolicyGroups: "搜索用户组...",
    searchPolicyTagOwners: "搜索标签授权...",
    existingRules: "当前访问规则",
    noPolicyRules: "还没有访问规则。",
    noPolicyGroups: "没有匹配的用户组。",
    noPolicyTagOwners: "没有匹配的标签授权。",
    highRisk: "高风险",
    reviewNeeded: "需要检查",
    noPolicyWarnings: "未发现阻塞问题。",
    preservedPolicySections: "保留的高级策略段",
    preservedPolicySectionsDescription: "这些策略段不在这里编辑，但保存时会继续保留。",
    noPreservedPolicySections: "没有额外策略段。",
    policyRulesTableRule: "规则",
    policyRulesTableSource: "谁",
    policyRulesTableDestination: "设备或标签",
    policyRulesTableService: "服务",
    policyRulesTableRisk: "风险",
    policyRulesTableActions: "操作",
    copied: "已复制",
    copy: "复制",
    openServerSettings: "服务器设置",
    serverSettingsTitle: "服务器设置",
    serverSettingsDescription: "管理服务器级凭证和维护操作。",
    apiKeysTitle: "API Keys",
    apiKeysDescription: "API key 可以控制这个 Headscale 服务器。完整 key 只会显示一次。",
    apiKeyPrefix: "Prefix",
    createdApiKey: "已创建 API Key",
    apiKeyOnlyShownOnce: "现在复制保存。Headscale 不会再次返回完整 key。",
    createApiKeyTitle: "创建 API Key",
    apiKeyExpiration: "API Key 过期时间",
    expireApiKeyTitle: "过期 API Key",
    deleteApiKeyTitle: "删除 API Key",
    confirmExpireApiKey: "过期 API Key",
    confirmDeleteApiKey: "删除 API Key",
    maintenance: "维护",
    maintenanceDescription: "这些操作会影响整个服务端。仅在修复或核验 Headscale 状态时使用。",
    backfillNodeIps: "回填节点 IP",
    backfillNodeIpsDescription: "执行 Headscale 的全局节点 IP 回填维护操作。",
    confirmBackfillNodeIps: "执行回填",
    backfillResult: "回填结果",
    refreshData: "刷新数据",
    lastUpdated: "最后更新",
  },
  fr: {
    ...englishCopy,
    nav: {
      home: "Aperçu",
      devices: "Machines",
      members: "Utilisateurs",
      invites: "Clés auth",
      routes: "Routes",
      access: "Accès",
    },
    dashboardTitle: "Aperçu du tailnet",
    dashboardSubtitle: "Un point d'accueil pour appareils, membres et routes privées.",
    currentServer: "Serveur actuel",
    time: "Heure",
    hour: "Heure",
    minute: "Minute",
    devicesTitle: "Machines",
    membersTitle: "Utilisateurs",
    memberDevices: "Appareils",
    invitesTitle: "Clés auth",
    routesTitle: "Routes",
    accessTitle: "Contrôles d'accès",
  },
  ru: {
    ...englishCopy,
    nav: {
      home: "Обзор",
      devices: "Машины",
      members: "Пользователи",
      invites: "Ключи",
      routes: "Маршруты",
      access: "Доступ",
    },
    dashboardTitle: "Обзор tailnet",
    dashboardSubtitle: "Центр управления устройствами, людьми и приватными маршрутами.",
    currentServer: "Текущий сервер",
    time: "Время",
    hour: "Час",
    minute: "Минута",
    devicesTitle: "Машины",
    membersTitle: "Пользователи",
    memberDevices: "Устройства",
    invitesTitle: "Ключи авторизации",
    routesTitle: "Маршруты",
    accessTitle: "Контроль доступа",
  },
  es: {
    ...englishCopy,
    nav: {
      home: "Resumen",
      devices: "Máquinas",
      members: "Usuarios",
      invites: "Claves",
      routes: "Rutas",
      access: "Acceso",
    },
    dashboardTitle: "Resumen del tailnet",
    dashboardSubtitle: "Un centro para dispositivos, personas y rutas privadas.",
    currentServer: "Servidor actual",
    time: "Hora",
    hour: "Hora",
    minute: "Minuto",
    devicesTitle: "Máquinas",
    membersTitle: "Usuarios",
    memberDevices: "Dispositivos",
    invitesTitle: "Claves de autenticación",
    routesTitle: "Rutas",
    accessTitle: "Controles de acceso",
  },
  ar: {
    ...englishCopy,
    nav: {
      home: "نظرة عامة",
      devices: "الأجهزة",
      members: "المستخدمون",
      invites: "مفاتيح الدخول",
      routes: "المسارات",
      access: "التحكم بالوصول",
    },
    dashboardTitle: "نظرة عامة على الشبكة",
    dashboardSubtitle: "مركز لإدارة الأجهزة والأعضاء والمسارات الخاصة.",
    currentServer: "الخادم الحالي",
    time: "الوقت",
    hour: "الساعة",
    minute: "الدقيقة",
    devicesTitle: "الأجهزة",
    membersTitle: "المستخدمون",
    memberDevices: "الأجهزة",
    invitesTitle: "مفاتيح الدخول",
    routesTitle: "المسارات",
    accessTitle: "التحكم بالوصول",
    accessSubtitle: "صمم قوائم ACL والمجموعات وملكية الوسوم من دون تعديل JSON الخام.",
    policyDesigner: "مصمم السياسة",
    ruleBuilder: "منشئ قواعد الوصول",
    source: "من",
    destination: "إلى",
    ports: "الخدمة",
    policyObjectPicker: "اختر العناصر من القوائم",
    policyDropHint: "اختر من القائمة",
    selectedRule: "القاعدة المحددة",
    sourceChoices: "الأشخاص والمجموعات",
    destinationChoices: "الأجهزة والوسوم",
    serviceChoices: "الخدمات",
    anySource: "الجميع",
    anySourceDescription: "كل المستخدمين والمجموعات والأجهزة الموسومة",
    anyDestination: "كل الأجهزة",
    anyDestinationDescription: "كل جهاز في هذه الشبكة",
    anyService: "كل الخدمات",
    anyServiceDescription: "كل المنافذ",
    userChoiceDescription: "حساب مستخدم",
    groupChoiceDescription: "مجموعة محفوظة",
    tagChoiceDescription: "أجهزة موسومة",
    deviceChoiceDescription: "عنوان جهاز محدد",
    serviceSsh: "SSH",
    serviceHttps: "HTTPS",
    serviceDns: "DNS",
    serviceSshDescription: "المنفذ 22",
    serviceHttpsDescription: "المنفذ 443",
    serviceDnsDescription: "المنفذ 53",
    policyRulePreview: "معاينة القاعدة",
    allowTraffic: "السماح بالمرور",
    addRule: "إضافة قاعدة",
    groups: "المجموعات",
    groupName: "اسم المجموعة",
    groupMembers: "الأعضاء",
    groupMemberPicker: "اختر المستخدمين من القائمة وأضفهم إلى هذه المجموعة.",
    selectedMembers: "الأعضاء المحددون",
    selectGroupMember: "اختر عضوا",
    addSelectedMember: "إضافة عضو",
    addGroup: "إضافة مجموعة",
    tagOwners: "مالكو الوسوم",
    tagName: "الوسم",
    ownersList: "المالكون",
    tagOwnerPicker: "اختر مستخدمين أو مجموعات وامنحهم هذا الوسم.",
    selectedOwners: "المالكون المحددون",
    selectTagOwner: "اختر مالكا",
    addSelectedOwner: "إضافة مالك",
    addTagOwner: "إضافة مالك وسم",
    removeItem: "إزالة",
    safetyReview: "مراجعة السلامة",
    readyToSave: "جاهز للحفظ",
    policyWarningOpenAccess: "تسمح قاعدة حاليا لكل مصدر بالوصول إلى كل وجهة.",
    policyWarningExitRoute: "تحتاج مسارات الخروج إلى مراجعة صريحة قبل الموافقة.",
    policySummary: "ملخص السياسة",
    policy: "السياسة",
    savePolicy: "حفظ السياسة",
    policyWorkspaceSummary:
      "تعرض القواعد كجمل واضحة. يتم حفظ أقسام السياسة المتقدمة كما هي عند الحفظ.",
    policyRulesTab: "قواعد الوصول",
    policyGroupsTab: "المجموعات",
    policyTagOwnersTab: "وصول الوسوم",
    policyReviewTab: "المراجعة",
    policyOverviewRules: "القواعد",
    policyOverviewGroups: "المجموعات",
    policyOverviewTags: "وصول الوسوم",
    policyOverviewWarnings: "التحذيرات",
    policyQuickStartTitle: "إنشاء قاعدة وصول",
    policyQuickStartDescription: "اختر من يمكنه الوصول إلى الأجهزة والخدمات. لا حاجة إلى JSON.",
    policyWhoCanAccess: "من يمكنه الوصول",
    policyWhatCanAccess: "ما الذي يمكنه الوصول إليه",
    policyWhichService: "أي خدمة",
    policySimplePreview: "معاينة بلغة واضحة",
    policyAdvancedPicker: "خيارات القائمة",
    policyAdvancedPickerDescription: "استخدم القوائم أعلاه لإنشاء القواعد من دون تعديل JSON.",
    searchPolicyRules: "ابحث في القواعد...",
    searchPolicyGroups: "ابحث في المجموعات...",
    searchPolicyTagOwners: "ابحث في وصول الوسوم...",
    existingRules: "قواعد الوصول الحالية",
    noPolicyRules: "لا توجد قواعد وصول بعد.",
    noPolicyGroups: "لا توجد مجموعات مطابقة.",
    noPolicyTagOwners: "لا توجد إدخالات وصول وسم مطابقة.",
    highRisk: "مخاطرة عالية",
    reviewNeeded: "تحتاج مراجعة",
    noPolicyWarnings: "لم يتم العثور على مشكلات مانعة.",
    preservedPolicySections: "أقسام السياسة المتقدمة المحفوظة",
    preservedPolicySectionsDescription:
      "لا يتم تعديل هذه الأقسام هنا، لكنها تبقى ضمن السياسة المحفوظة.",
    noPreservedPolicySections: "لا توجد أقسام سياسة إضافية.",
    policyRulesTableRule: "القاعدة",
    policyRulesTableSource: "من",
    policyRulesTableDestination: "الجهاز أو الوسم",
    policyRulesTableService: "الخدمة",
    policyRulesTableRisk: "المخاطرة",
    policyRulesTableActions: "الإجراءات",
  },
} satisfies Record<SourceLocale, ProductCopy>;

const productCopy: Record<Locale, ProductCopy> = {
  ...productCopyBase,
  "zh-Hant": toTraditionalChineseValue(productCopyBase.zh),
};

function defaultConnectionForm(): ConnectionForm {
  return {
    profileId: newProfileId,
    profileName: "Local mock",
    mode: "mock",
    baseUrl: localMockBaseUrl,
    apiKey: "mock-api-key",
    remember: true,
  };
}

function normalizedBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, "");
}

function resolveConnectionMode(mode: ConnectionSettings["mode"], baseUrl: string) {
  if (mode === "mock" && normalizedBaseUrl(baseUrl) !== localMockBaseUrl) {
    return "real";
  }

  return mode;
}

function createProfileId() {
  return crypto.randomUUID();
}

function profileToForm(profile: ConnectionProfile): ConnectionForm {
  return {
    profileId: profile.id,
    profileName: profile.name,
    mode: profile.mode,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    remember: profileStorage.getProfileScope(profile.id) !== "session",
  };
}

function normalizeProfile(profile: Partial<ConnectionProfile>): ConnectionProfile | null {
  if (!profile.baseUrl || !profile.apiKey || (profile.mode !== "mock" && profile.mode !== "real")) {
    return null;
  }

  const baseUrl = profile.baseUrl.trim();

  return {
    id: profile.id || createProfileId(),
    name: profile.name || baseUrl,
    mode: resolveConnectionMode(profile.mode, baseUrl),
    baseUrl,
    apiKey: profile.apiKey,
    updatedAt: profile.updatedAt || new Date().toISOString(),
  };
}

function normalizeProfiles(profileRecords: Partial<ConnectionProfile>[]) {
  return profileRecords
    .map((profile) => normalizeProfile(profile))
    .filter((profile): profile is ConnectionProfile => profile !== null);
}

function loadConnectionProfiles(): ConnectionProfile[] {
  const savedProfiles = normalizeProfiles(profileStorage.loadProfiles());
  if (savedProfiles.length > 0) {
    return savedProfiles;
  }

  const legacyConnection = profileStorage.consumeLegacyConnection();
  if (!legacyConnection) {
    return [];
  }

  try {
    const migrated = normalizeProfile({
      ...(JSON.parse(legacyConnection) as Partial<ConnectionProfile>),
      name: "Default",
    });
    if (!migrated) {
      return [];
    }
    profileStorage.saveProfile(migrated, "persistent");
    profileStorage.setActiveProfile(migrated.id, "persistent");
    return [migrated];
  } catch {
    return [];
  }
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "auto";
}

function initialThemeMode(): ThemeMode {
  if (typeof localStorage === "undefined") {
    return "auto";
  }

  const savedTheme = localStorage.getItem(themeStorageKey);
  return isThemeMode(savedTheme) ? savedTheme : "auto";
}

function prefersDarkMode() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle(
      "dark",
      mode === "dark" || (mode === "auto" && prefersDarkMode()),
    );
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(themeStorageKey, mode);
  }
}

const colorMode = ref<ThemeMode>(initialThemeMode());
const route = useRoute();
const router = useRouter();
const profiles = ref<ConnectionProfile[]>(loadConnectionProfiles());
const connectionForm = reactive<ConnectionForm>(defaultConnectionForm());
const settings = reactive<ConnectionSettings>({
  mode: connectionForm.mode,
  baseUrl: connectionForm.baseUrl,
  apiKey: connectionForm.apiKey,
});

const mockClient = new MockHeadscaleClient();
const snapshot = ref<HeadscaleSnapshot>(mockClient.snapshot);
const isAuthorized = ref(false);
const isConnecting = ref(false);
const isRestoringSession = ref(true);
const connectionDialogOpen = ref(false);
const authenticatingProfileId = ref<string | null>(null);
const profileValidationDialogOpen = ref(false);
const profileValidationError = ref("");
const pendingDeleteProfile = ref<ConnectionProfile | null>(null);
const profileMenuOpen = ref(false);
const profileSubmenu = ref<ProfileSubmenu | null>(null);
const deviceSetupDialogOpen = ref(false);
const deviceSetupTask = ref<AddDeviceTask | null>(null);
const addDeviceStep = ref<AddDeviceStep>("type");
const serverSettingsDialogOpen = ref(false);
const serverSettingsTab = ref<ServerSettingsTab>("apiKeys");
const activeSection = ref<ProductSection>("home");
const lastError = ref("");
const copiedKey = ref("");
const lastCreatedInvite = ref("");
const policyDraft = ref("");
const activePolicyTab = ref<PolicyWorkspaceTab>("rules");
const policyGroupMemberSelection = ref("");
const policyTagOwnerSelection = ref("");
const policyRemovalDialogOpen = ref(false);
const pendingPolicyRemoval = ref<PolicyRemovalTarget | null>(null);
const deviceSearch = ref("");
const machineFilter = ref<MachineFilter>("all");
const authKeyExpiryDays = ref(7);
const userSearch = ref("");
const userFilter = ref<UserFilter>("all");
const inviteSearch = ref("");
const inviteFilter = ref<InviteFilter>("all");
const renameDrafts = reactive<Record<string, string>>({});
const renameDialogOpen = ref(false);
const memberDialogOpen = ref(false);
const inviteDialogOpen = ref(false);
const isCreatingInvite = ref(false);
const returnToDeviceSetupAfterInvite = ref(false);
const expireDialogOpen = ref(false);
const removeDialogOpen = ref(false);
const routeApprovalDialogOpen = ref(false);
const selectedRenameNode = ref<HeadscaleNode | null>(null);
const selectedExpireNode = ref<HeadscaleNode | null>(null);
const selectedRemoveNode = ref<HeadscaleNode | null>(null);
const selectedRouteApproval = ref<RouteApprovalTarget | null>(null);
const selectedTagsNode = ref<HeadscaleNode | null>(null);
const selectedRenameUser = ref<HeadscaleUser | null>(null);
const pendingDeleteUser = ref<HeadscaleUser | null>(null);
const pendingInviteAction = ref<InviteActionTarget | null>(null);
const pendingApiKeyAction = ref<ApiKeyActionTarget | null>(null);
const selectedRoutesApprovalNode = ref<HeadscaleNode | null>(null);
const selectedDetailNode = ref<HeadscaleNode | null>(null);
const selectedDetailUser = ref<HeadscaleUser | null>(null);
const memberForm = reactive({
  name: "",
  displayName: "",
  email: "",
});
const inviteForm = reactive({
  user: "1",
  reusable: true,
  ephemeral: false,
  expiration: "2026-12-31T23:59:00Z",
  aclTags: "",
});
const pendingRegistrationForm = reactive({
  user: "1",
  key: "nodekey:pending-demo",
  authId: "auth-demo",
});
const tagsForm = reactive({
  tags: "",
});
const renameMemberForm = reactive({
  name: "",
});
const apiKeyForm = reactive({
  expiration: "2026-12-31T23:59:00Z",
});
const lastRegisteredNode = ref<HeadscaleNode | null>(null);
const authRequestResult = ref("");
const createdApiKey = ref("");
const backfillNodeIpsDialogOpen = ref(false);
const backfillNodeIpsConfirmed = ref(false);
const backfillNodeIpsResult = ref("");
const policyRules = ref<PolicyRule[]>([]);
const policyGroups = ref<PolicyGroup[]>([]);
const policyTagOwners = ref<PolicyTagOwner[]>([]);
const policyExtraSections = ref<Record<string, unknown>>({});
const policyRuleDialogOpen = ref(false);
const policyGroupDialogOpen = ref(false);
const policyTagOwnerDialogOpen = ref(false);
const policyRuleSearch = ref("");
const policyGroupSearch = ref("");
const policyTagOwnerSearch = ref("");
const policyRuleForm = reactive({
  source: "*",
  destination: "*",
  ports: "*",
});
const policyGroupForm = reactive({
  name: "group:ops",
  members: "alice@example.com",
});
const policyTagOwnerForm = reactive({
  tag: "tag:server",
  owners: "group:ops",
});
let healthProbeTimer: ReturnType<typeof window.setInterval> | null = null;
let isHealthProbeRunning = false;
let healthProbeGeneration = 0;
let profileRouteSyncGeneration = 0;
let nodeDetailRefreshGeneration = 0;
let userDetailRefreshGeneration = 0;
let inviteDialogRefreshGeneration = 0;
let memberDialogRefreshGeneration = 0;
let renameDialogRefreshGeneration = 0;
let expireDialogRefreshGeneration = 0;
let removeDialogRefreshGeneration = 0;
let routeApprovalRefreshGeneration = 0;

const sectionIcons = {
  home: Activity,
  devices: Network,
  members: Users,
  invites: KeyRound,
  routes: Router,
  access: FileCheck2,
};

const copy = computed(() => productCopy[locale.value]);
const onlineNodes = computed(() => snapshot.value.nodes.filter((node) => node.online));
const openInvites = computed(() =>
  snapshot.value.preAuthKeys.filter((key) => !key.used && !isExpired(key.expiration)),
);
const routeNodes = computed(() =>
  snapshot.value.nodes.filter(
    (node) => node.availableRoutes.length > 0 || node.approvedRoutes.length > 0,
  ),
);
const isProfileRoute = computed(() => routeProfileId() !== "");
const routesWaiting = computed(() =>
  snapshot.value.nodes.reduce((total, node) => {
    const pending = node.availableRoutes.filter((route) => !node.approvedRoutes.includes(route));
    return total + pending.length;
  }, 0),
);
const visibleUsers = computed(() => snapshot.value.users.filter((user) => hasVisibleUser(user)));
const filteredNodes = computed(() => {
  const query = deviceSearch.value.trim().toLowerCase();
  return snapshot.value.nodes.filter((node) => {
    const searchable = [
      node.name,
      node.givenName,
      ...(hasVisibleUser(node.user) ? [node.user?.name, node.user?.email, nodeOwner(node)] : []),
      node.ipAddresses.join(" "),
      node.tags.join(" "),
      node.availableRoutes.join(" "),
      node.approvedRoutes.join(" "),
      node.registerMethod,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesFilter =
      machineFilter.value === "all" ||
      (machineFilter.value === "online" && node.online) ||
      (machineFilter.value === "offline" && !node.online) ||
      (machineFilter.value === "expired" && isExpired(node.expiry)) ||
      (machineFilter.value === "routes" && node.availableRoutes.length > 0) ||
      (machineFilter.value === "tagged" && node.tags.length > 0);

    return matchesSearch && matchesFilter;
  });
});
const hasMachineFilters = computed(
  () => deviceSearch.value.trim() !== "" || machineFilter.value !== "all",
);
const filteredUsers = computed(() => {
  const query = userSearch.value.trim().toLowerCase();
  return visibleUsers.value.filter((user) => {
    const role = userRole(user).toLowerCase();
    const searchable = [
      user.name,
      user.displayName,
      userLabel(user),
      user.email,
      user.provider,
      user.providerId,
      userAuthSource(user),
      role,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesFilter =
      userFilter.value === "all" ||
      (userFilter.value === "owner" && role === "owner") ||
      (userFilter.value === "member" && role === "member") ||
      (userFilter.value === "service" && role === "service account");

    return matchesSearch && matchesFilter;
  });
});
const filteredPreAuthKeys = computed(() => {
  const query = inviteSearch.value.trim().toLowerCase();
  return snapshot.value.preAuthKeys.filter((key) => {
    const searchable = [
      key.key,
      userLabel(key.user),
      key.user?.name,
      key.user?.email,
      keyStatus(key),
      key.reusable ? copy.value.reusable : copy.value.oneTimeKey,
      key.ephemeral ? copy.value.ephemeral : "",
      key.expiration,
      key.createdAt,
      key.aclTags.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesFilter =
      inviteFilter.value === "all" ||
      (inviteFilter.value === "ready" && !key.used && !isExpired(key.expiration)) ||
      (inviteFilter.value === "used" && key.used) ||
      (inviteFilter.value === "expired" && isExpired(key.expiration)) ||
      (inviteFilter.value === "tagged" && key.aclTags.length > 0);

    return matchesSearch && matchesFilter;
  });
});
const selectedUserDevices = computed(() =>
  selectedDetailUser.value ? userDevices(selectedDetailUser.value) : [],
);
const selectedUserActiveKeys = computed(() =>
  selectedDetailUser.value ? activeAuthKeysForUser(selectedDetailUser.value) : [],
);
const selectedUserPolicyReferences = computed(() =>
  selectedDetailUser.value ? userPolicyReferences(selectedDetailUser.value) : [],
);
const selectedUserPendingRoutesCount = computed(() =>
  selectedUserDevices.value.reduce((total, node) => total + nodePendingRoutes(node).length, 0),
);
const selectedRoutesApprovalPending = computed(() =>
  selectedRoutesApprovalNode.value ? nodePendingRoutes(selectedRoutesApprovalNode.value) : [],
);
const selectedRoutesApprovalHasExitRoute = computed(() =>
  selectedRoutesApprovalPending.value.some((route) => isExitRoute(route)),
);
const authKeyDialogUsers = computed(() =>
  visibleUsers.value.map((user) => ({
    id: user.id,
    label: userLabel(user),
  })),
);
const authKeyDialogDefaults = computed<AuthKeyDialogDefaults>(() => ({
  user: inviteForm.user,
  reusable: inviteForm.reusable,
  ephemeral: inviteForm.ephemeral,
  expiration: inviteForm.expiration,
  aclTags: inviteForm.aclTags,
}));
const authKeyDialogLabels = computed<AuthKeyDialogLabels>(() => ({
  title: copy.value.createInvite,
  description: copy.value.invitesSubtitle,
  owner: copy.value.inviteOwner,
  expiration: copy.value.inviteExpiration,
  aclTags: copy.value.aclTags,
  reusable: copy.value.reusable,
  ephemeral: copy.value.ephemeral,
  cancel: copy.value.cancel,
  submit: copy.value.createInvite,
  noUsers: copy.value.noUsers,
  time: copy.value.time,
  hour: copy.value.hour,
  minute: copy.value.minute,
}));
const installCommand = computed(() => {
  if (!lastCreatedInvite.value) {
    return "";
  }

  return `tailscale up --login-server ${normalizedBaseUrl(settings.baseUrl)} --authkey ${lastCreatedInvite.value}`;
});
const deviceSetupTitle = computed(() => {
  if (deviceSetupTask.value === "pending") {
    return copy.value.pendingRegistrationTitle;
  }
  if (deviceSetupTask.value === "server") {
    return copy.value.addLinuxServerTitle;
  }
  return copy.value.addClientDeviceTitle;
});
const deviceSetupDescription = computed(() => {
  if (deviceSetupTask.value === "pending") {
    return copy.value.pendingRegistrationDescription;
  }
  return deviceSetupTask.value === "server"
    ? copy.value.linuxServerDescription
    : copy.value.clientDeviceDescription;
});
const addDeviceSteps = computed<Array<{ id: AddDeviceStep; label: string; description: string }>>(
  () => {
    if (deviceSetupTask.value === "pending") {
      return [
        {
          id: "pending",
          label: copy.value.pendingRegistrationTitle,
          description: copy.value.wizardStepPendingDescription,
        },
        {
          id: "result",
          label: copy.value.wizardResult,
          description: copy.value.wizardStepResultDescription,
        },
      ];
    }

    if (deviceSetupTask.value) {
      return [
        {
          id: "preferences",
          label: copy.value.setupDevice,
          description: copy.value.wizardStepPreferencesDescription,
        },
        {
          id: "authKey",
          label: copy.value.setupAuthKey,
          description: copy.value.wizardStepAuthKeyDescription,
        },
        {
          id: "generate",
          label: copy.value.generateInstallScript,
          description: copy.value.wizardStepGenerateDescription,
        },
      ];
    }

    return [];
  },
);
const addDeviceStepIndex = computed(() => {
  const index = addDeviceSteps.value.findIndex((step) => step.id === addDeviceStep.value);
  return index === -1 ? 0 : index;
});
const canMoveAddDeviceNext = computed(() => {
  if (addDeviceStepIndex.value >= addDeviceSteps.value.length - 1) {
    return false;
  }

  if (addDeviceStep.value === "pending") {
    return Boolean(lastRegisteredNode.value || authRequestResult.value);
  }

  return deviceSetupTask.value !== null;
});
const knownPolicyTags = computed(() =>
  Array.from(
    new Set([
      ...snapshot.value.nodes.flatMap((node) => node.tags),
      ...policyTagOwners.value.map((tagOwner) => tagOwner.tag),
    ]),
  ).filter(Boolean),
);
const policyGroupNameChoices = computed(() =>
  Array.from(
    new Set([
      "group:ops",
      "group:dev",
      "group:admins",
      ...policyGroups.value.map((group) => group.name),
    ]),
  ).filter(Boolean),
);
const policyTagNameChoices = computed(() =>
  Array.from(new Set(["tag:server", "tag:workstation", "tag:db", ...knownPolicyTags.value])).filter(
    Boolean,
  ),
);
const policyMemberChoices = computed<PolicyListChoice[]>(() =>
  visibleUsers.value
    .filter((user) => user.email || user.name)
    .map((user) => ({
      id: policyChoiceId("source", user.email || user.name),
      label: userLabel(user),
      value: user.email || user.name,
      description: copy.value.userChoiceDescription,
    })),
);
const policyOwnerChoices = computed<PolicyListChoice[]>(() => [
  ...policyGroups.value.map((group) => ({
    id: policyChoiceId("source", group.name),
    label: group.name,
    value: group.name,
    description: copy.value.groupChoiceDescription,
  })),
  ...policyMemberChoices.value,
]);
const policySourceChoices = computed<PolicyChoice[]>(() => {
  const choices: PolicyChoice[] = [
    {
      id: policyChoiceId("source", "*"),
      slot: "source",
      label: copy.value.anySource,
      value: "*",
      description: copy.value.anySourceDescription,
    },
    ...visibleUsers.value
      .filter((user) => user.email || user.name)
      .map((user) => ({
        id: policyChoiceId("source", user.email || user.name),
        slot: "source" as const,
        label: userLabel(user),
        value: user.email || user.name,
        description: copy.value.userChoiceDescription,
      })),
    ...policyGroupNameChoices.value.map((groupName) => ({
      id: policyChoiceId("source", groupName),
      slot: "source" as const,
      label: groupName,
      value: groupName,
      description: copy.value.groupChoiceDescription,
    })),
    ...knownPolicyTags.value.map((tag) => ({
      id: policyChoiceId("source", tag),
      slot: "source" as const,
      label: tag,
      value: tag,
      description: copy.value.tagChoiceDescription,
    })),
  ];

  return choices.filter(
    (choice, index) => choices.findIndex((candidate) => candidate.value === choice.value) === index,
  );
});
const policyDestinationChoices = computed<PolicyChoice[]>(() => {
  const choices: PolicyChoice[] = [
    {
      id: policyChoiceId("destination", "*"),
      slot: "destination",
      label: copy.value.anyDestination,
      value: "*",
      description: copy.value.anyDestinationDescription,
    },
    ...policyTagNameChoices.value.map((tag) => ({
      id: policyChoiceId("destination", tag),
      slot: "destination" as const,
      label: tag,
      value: tag,
      description: copy.value.tagChoiceDescription,
    })),
    ...snapshot.value.nodes
      .filter((node) => node.ipAddresses[0])
      .map((node) => ({
        id: policyChoiceId("destination", node.ipAddresses[0]),
        slot: "destination" as const,
        label: node.givenName || node.name,
        value: node.ipAddresses[0],
        description: copy.value.deviceChoiceDescription,
      })),
  ];

  return choices.filter(
    (choice, index) => choices.findIndex((candidate) => candidate.value === choice.value) === index,
  );
});
const policyServiceChoices = computed<PolicyChoice[]>(() => [
  {
    id: policyChoiceId("ports", "*"),
    slot: "ports",
    label: copy.value.anyService,
    value: "*",
    description: copy.value.anyServiceDescription,
  },
  {
    id: policyChoiceId("ports", "22"),
    slot: "ports",
    label: copy.value.serviceSsh,
    value: "22",
    description: copy.value.serviceSshDescription,
  },
  {
    id: policyChoiceId("ports", "443"),
    slot: "ports",
    label: copy.value.serviceHttps,
    value: "443",
    description: copy.value.serviceHttpsDescription,
  },
  {
    id: policyChoiceId("ports", "53"),
    slot: "ports",
    label: copy.value.serviceDns,
    value: "53",
    description: copy.value.serviceDnsDescription,
  },
]);
const policyRulePreview = computed(() =>
  policyRuleSentence(policyRuleForm.source, policyRuleForm.destination, policyRuleForm.ports),
);
const policyPayload = computed(() => {
  const groups = Object.fromEntries(
    policyGroups.value
      .filter((group) => group.name.trim())
      .map((group) => [group.name.trim(), parseCommaList(group.members)]),
  );
  const tagOwners = Object.fromEntries(
    policyTagOwners.value
      .filter((tagOwner) => tagOwner.tag.trim())
      .map((tagOwner) => [tagOwner.tag.trim(), parseCommaList(tagOwner.owners)]),
  );
  const acls = policyRules.value.map((rule) => ({
    action: rule.action,
    src: parseCommaList(rule.source),
    dst: parsePolicyDestinations(rule.destination, rule.ports),
  }));

  return {
    ...policyExtraSections.value,
    groups,
    tagOwners,
    acls,
  };
});
const policyWarnings = computed(() => {
  const warnings: string[] = [];
  if (
    policyRules.value.some(
      (rule) => rule.source.trim() === "*" && rule.destination.trim() === "*" && rule.ports === "*",
    )
  ) {
    warnings.push(copy.value.policyWarningOpenAccess);
  }
  if (routeNodes.value.some((node) => node.availableRoutes.some((route) => isExitRoute(route)))) {
    warnings.push(copy.value.policyWarningExitRoute);
  }

  return warnings;
});
const policyRiskCount = computed(() => policyWarnings.value.length);
const policyExtraSectionKeys = computed(() => Object.keys(policyExtraSections.value).sort());
const policyWorkspaceSummary = computed(() =>
  locale.value === "zh"
    ? `${policyRules.value.length} 条规则，${policyGroups.value.length} 个用户组，${policyTagOwners.value.length} 个标签授权，${policyRiskCount.value} 个风险。`
    : locale.value === "ar"
      ? `${policyRules.value.length} قاعدة، ${policyGroups.value.length} مجموعة، ${policyTagOwners.value.length} منح وسوم و ${policyRiskCount.value} تحذيرات.`
      : `${policyRules.value.length} rules, ${policyGroups.value.length} groups, ${policyTagOwners.value.length} tag grants and ${policyRiskCount.value} warnings.`,
);
const filteredPolicyRules = computed(() => {
  const query = policyRuleSearch.value.trim().toLowerCase();
  if (!query) {
    return policyRules.value;
  }

  return policyRules.value.filter((rule) =>
    [
      policyRuleSentence(rule.source, rule.destination, rule.ports),
      policyChoiceLabel("source", rule.source),
      policyChoiceLabel("destination", rule.destination),
      policyChoiceLabel("ports", rule.ports),
      isPolicyRuleHighRisk(rule) ? copy.value.highRisk : copy.value.readyToSave,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
});
const filteredPolicyGroups = computed(() => {
  const query = policyGroupSearch.value.trim().toLowerCase();
  if (!query) {
    return policyGroups.value;
  }

  return policyGroups.value.filter((group) =>
    [group.name, group.members].join(" ").toLowerCase().includes(query),
  );
});
const filteredPolicyTagOwners = computed(() => {
  const query = policyTagOwnerSearch.value.trim().toLowerCase();
  if (!query) {
    return policyTagOwners.value;
  }

  return policyTagOwners.value.filter((tagOwner) =>
    [tagOwner.tag, tagOwner.owners].join(" ").toLowerCase().includes(query),
  );
});
const themeLabel = computed(() => themeModeLabel(colorMode.value));
const currentProfileLabel = computed(() => connectionForm.profileName || t("profile"));
const selectedProfile = computed(() =>
  profiles.value.find((profile) => profile.id === connectionForm.profileId),
);
const restoringProfile = computed(() => {
  const profileId = routeProfileId();
  return profileId ? profiles.value.find((profile) => profile.id === profileId) : null;
});
const serverSignalStrength = computed<ServerSignalStrength>(() => {
  const health = snapshot.value.health;
  if (!health?.serverReachable) {
    return "offline";
  }

  const latencyMs = health.latencyMs ?? Number.POSITIVE_INFINITY;
  if (latencyMs <= 150) {
    return "strong";
  }
  if (latencyMs <= 400) {
    return "good";
  }
  if (latencyMs <= 900) {
    return "weak";
  }
  return "poor";
});
const serverSignalIcon = computed(() => {
  if (serverSignalStrength.value === "strong") {
    return WifiHigh;
  }
  if (serverSignalStrength.value === "good") {
    return Wifi;
  }
  if (serverSignalStrength.value === "weak") {
    return WifiLow;
  }
  if (serverSignalStrength.value === "poor") {
    return WifiZero;
  }
  return WifiOff;
});
const serverSignalClass = computed(() => {
  if (serverSignalStrength.value === "strong") {
    return "border-background bg-emerald-500 text-white";
  }
  if (serverSignalStrength.value === "good") {
    return "border-background bg-lime-500 text-white";
  }
  if (serverSignalStrength.value === "weak") {
    return "border-background bg-amber-500 text-white";
  }
  if (serverSignalStrength.value === "poor") {
    return "border-background bg-orange-500 text-white";
  }
  return "border-background bg-destructive text-destructive-foreground";
});
const serverSignalLabel = computed(() => {
  const health = snapshot.value.health;
  if (!health?.serverReachable) {
    return `${copy.value.serverIssue}`;
  }
  const latency = typeof health.latencyMs === "number" ? `, ${health.latencyMs} ms` : "";
  return `${copy.value.serverReady}${latency}`;
});

function themeModeLabel(mode: ThemeMode) {
  if (mode === "dark") {
    return t("dark");
  }
  if (mode === "light") {
    return t("light");
  }
  return t("system");
}

function profileAvatarLabel(profile: ConnectionProfile) {
  const source = profile.name || profile.baseUrl;
  return source.trim().slice(0, 2).toUpperCase() || "HS";
}

function profileModeLabel(mode: ConnectionSettings["mode"]) {
  return mode === "mock" ? t("mockMode") : t("realMode");
}

function routeParam(value: unknown) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return typeof value === "string" ? value : "";
}

function routeProfileId() {
  return routeParam(route.params.profileId);
}

function routeSection() {
  const section = routeParam(route.params.group);
  return productSections.includes(section as ProductSection) ? (section as ProductSection) : "home";
}

async function pushProfileRoute(profileId: string, section: ProductSection = activeSection.value) {
  await router.push({
    name: "profile",
    params: {
      profileId,
      group: section,
    },
  });
}

function setActiveSection(section: ProductSection) {
  activeSection.value = section;
  scrollActiveTabIntoView();
  window.setTimeout(scrollActiveTabIntoView, 0);
}

function createClient(connectionSettings: ConnectionSettings = settings): HeadscaleClient {
  if (connectionSettings.mode === "mock") {
    return mockClient;
  }

  return new RestHeadscaleClient(connectionSettings);
}

async function fetchSnapshot(client: HeadscaleClient): Promise<HeadscaleSnapshot> {
  const [health, version, users, preAuthKeys, nodes, apiKeys, policy] = await Promise.all([
    client.health(),
    client.version(),
    client.listUsers({}),
    client.listPreAuthKeys(),
    client.listNodes({}),
    client.listApiKeys(),
    client.getPolicy(),
  ]);

  return {
    health,
    version,
    users: users.users,
    preAuthKeys: preAuthKeys.preAuthKeys,
    nodes: nodes.nodes,
    apiKeys: apiKeys.apiKeys,
    policy,
  };
}

function applySnapshot(nextSnapshot: HeadscaleSnapshot) {
  snapshot.value = nextSnapshot;
  policyDraft.value = nextSnapshot.policy?.policy ?? "";
  loadPolicyDesigner(policyDraft.value);
  for (const node of nextSnapshot.nodes) {
    renameDrafts[node.id] = node.givenName || node.name;
  }
}

function applyOfflineHealth() {
  snapshot.value = {
    ...snapshot.value,
    health: {
      checkedAt: new Date().toISOString(),
      databaseConnectivity: false,
      serverReachable: false,
    },
  };
}

async function probeServerConnection() {
  if (!isAuthorized.value || isHealthProbeRunning) {
    return;
  }

  const generation = healthProbeGeneration;
  isHealthProbeRunning = true;
  try {
    const health = await createClient().health();
    if (generation !== healthProbeGeneration || !isAuthorized.value) {
      return;
    }
    snapshot.value = {
      ...snapshot.value,
      health,
    };
  } catch {
    if (generation !== healthProbeGeneration || !isAuthorized.value) {
      return;
    }
    applyOfflineHealth();
  } finally {
    if (generation === healthProbeGeneration) {
      isHealthProbeRunning = false;
    }
  }
}

function stopHealthProbe() {
  healthProbeGeneration += 1;
  if (healthProbeTimer !== null) {
    window.clearInterval(healthProbeTimer);
    healthProbeTimer = null;
  }
  isHealthProbeRunning = false;
}

function restartHealthProbe() {
  stopHealthProbe();
  if (!isAuthorized.value) {
    return;
  }

  healthProbeTimer = window.setInterval(() => {
    void probeServerConnection();
  }, 5000);
}

async function refreshSnapshot() {
  if (!isAuthorized.value) {
    return;
  }

  try {
    applySnapshot(await fetchSnapshot(createClient()));
    lastError.value = "";
  } catch (error) {
    applyOfflineHealth();
    lastError.value = error instanceof Error ? error.message : String(error);
  }
}

function currentNode(nodeId: string) {
  return snapshot.value.nodes.find((node) => node.id === nodeId);
}

function currentUser(userId: string) {
  return snapshot.value.users.find((user) => user.id === userId);
}

async function refreshNodeDetail(nodeId: string, generation: number) {
  await refreshSnapshot();
  if (generation !== nodeDetailRefreshGeneration || selectedDetailNode.value?.id !== nodeId) {
    return;
  }

  selectedDetailNode.value = currentNode(nodeId) ?? null;
}

async function refreshUserDetail(userId: string, generation: number) {
  await refreshSnapshot();
  if (generation !== userDetailRefreshGeneration || selectedDetailUser.value?.id !== userId) {
    return;
  }

  const nextUser = currentUser(userId);
  selectedDetailUser.value = nextUser && hasVisibleUser(nextUser) ? nextUser : null;
}

async function refreshOpenInviteDialog(generation: number) {
  await refreshSnapshot();
  if (generation !== inviteDialogRefreshGeneration || !inviteDialogOpen.value) {
    return;
  }

  if (!authKeyDialogUsers.value.some((user) => user.id === inviteForm.user)) {
    inviteForm.user = authKeyDialogUsers.value[0]?.id ?? "";
  }
}

async function refreshOpenMemberDialog(generation: number) {
  await refreshSnapshot();
  if (generation !== memberDialogRefreshGeneration || !memberDialogOpen.value) {
    return;
  }
}

async function refreshRenameDialogNode(nodeId: string, generation: number, draftAtOpen: string) {
  await refreshSnapshot();
  if (
    generation !== renameDialogRefreshGeneration ||
    !renameDialogOpen.value ||
    selectedRenameNode.value?.id !== nodeId
  ) {
    return;
  }

  const nextNode = currentNode(nodeId);
  if (!nextNode) {
    handleRenameDialogOpen(false);
    return;
  }

  selectedRenameNode.value = nextNode;
  if (renameDrafts[nodeId] === draftAtOpen) {
    renameDrafts[nodeId] = nextNode.givenName || nextNode.name;
  }
}

async function refreshExpireDialogNode(nodeId: string, generation: number) {
  await refreshSnapshot();
  if (
    generation !== expireDialogRefreshGeneration ||
    !expireDialogOpen.value ||
    selectedExpireNode.value?.id !== nodeId
  ) {
    return;
  }

  selectedExpireNode.value = currentNode(nodeId) ?? null;
}

async function refreshRemoveDialogNode(nodeId: string, generation: number) {
  await refreshSnapshot();
  if (
    generation !== removeDialogRefreshGeneration ||
    !removeDialogOpen.value ||
    selectedRemoveNode.value?.id !== nodeId
  ) {
    return;
  }

  selectedRemoveNode.value = currentNode(nodeId) ?? null;
}

async function refreshRouteApprovalTarget(nodeId: string, route: string, generation: number) {
  await refreshSnapshot();
  if (
    generation !== routeApprovalRefreshGeneration ||
    !routeApprovalDialogOpen.value ||
    selectedRouteApproval.value?.node.id !== nodeId ||
    selectedRouteApproval.value?.route !== route
  ) {
    return;
  }

  const nextNode = currentNode(nodeId);
  if (!nextNode?.availableRoutes.includes(route)) {
    handleRouteApprovalDialogOpen(false);
    return;
  }

  selectedRouteApproval.value = { node: nextNode, route };
}

function reloadProfiles() {
  profiles.value = normalizeProfiles(profileStorage.loadProfiles());
}

function profileScopeFromForm(): ProfileStorageScope {
  return connectionForm.remember ? "persistent" : "session";
}

function formConnectionSettings(): ConnectionSettings {
  const baseUrl = connectionForm.baseUrl.trim();
  return {
    mode: resolveConnectionMode(connectionForm.mode, baseUrl),
    baseUrl,
    apiKey: connectionForm.apiKey.trim(),
  };
}

function loadProfile(profileId: string) {
  connectionForm.profileId = profileId;

  if (profileId === newProfileId) {
    Object.assign(connectionForm, defaultConnectionForm());
    return;
  }

  const profile = profiles.value.find((item) => item.id === profileId);
  if (!profile) {
    return;
  }

  Object.assign(connectionForm, profileToForm(profile));
}

function openConnectionDialog(profileId: string) {
  lastError.value = "";
  loadProfile(profileId);
  connectionDialogOpen.value = true;
}

async function enterProfile(profile: ConnectionProfile) {
  connectionDialogOpen.value = false;
  await switchAuthorizedProfile(profile);
}

function editProfile(profile: ConnectionProfile) {
  openConnectionDialog(profile.id);
}

function handleConnectionDialogOpen(open: boolean) {
  connectionDialogOpen.value = open;
  if (!open) {
    lastError.value = "";
    profileValidationDialogOpen.value = false;
    profileValidationError.value = "";
  }
}

function persistConnection(): string {
  const baseUrl = connectionForm.baseUrl.trim();
  const name = connectionForm.profileName.trim() || baseUrl;
  const existingProfile =
    connectionForm.profileId === newProfileId
      ? null
      : profiles.value.find((profile) => profile.id === connectionForm.profileId);
  const profile: ConnectionProfile = {
    id: existingProfile?.id ?? createProfileId(),
    name,
    mode: resolveConnectionMode(connectionForm.mode, baseUrl),
    baseUrl,
    apiKey: connectionForm.apiKey.trim(),
    updatedAt: new Date().toISOString(),
  };

  profiles.value = existingProfile
    ? profiles.value.map((item) => (item.id === existingProfile.id ? profile : item))
    : [...profiles.value, profile];
  connectionForm.profileId = profile.id;
  connectionForm.profileName = profile.name;
  connectionForm.mode = profile.mode;
  const scope = profileScopeFromForm();
  profileStorage.saveProfile(profile, scope);
  reloadProfiles();

  return profile.id;
}

async function authorizeProfile(profile: ConnectionProfile, section: ProductSection) {
  Object.assign(connectionForm, profileToForm(profile));
  const startedAt = performance.now();
  const nextSettings: ConnectionSettings = {
    mode: profile.mode,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
  };

  setActiveSection(section);
  isConnecting.value = true;
  authenticatingProfileId.value = profile.id;
  lastError.value = "";

  try {
    const nextSnapshot = await fetchSnapshot(createClient(nextSettings));
    settings.mode = nextSettings.mode;
    settings.baseUrl = nextSettings.baseUrl;
    settings.apiKey = nextSettings.apiKey;
    applySnapshot(nextSnapshot);
    isAuthorized.value = true;
    profileStorage.setActiveProfile(
      profile.id,
      profileStorage.getProfileScope(profile.id) ?? "session",
    );
  } catch (error) {
    isAuthorized.value = false;
    lastError.value = error instanceof Error ? error.message : String(error);
    profileStorage.clearActiveProfile();
  } finally {
    const remainingMs = profileLoginMinimumMs - (performance.now() - startedAt);
    if (remainingMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
    }
    isConnecting.value = false;
    authenticatingProfileId.value = null;
  }
}

async function syncProfileRoute() {
  profileRouteSyncGeneration += 1;
  const generation = profileRouteSyncGeneration;
  const profileId = routeProfileId();
  if (!isAuthorized.value) {
    isRestoringSession.value = true;
  }

  try {
    if (!profileId) {
      isAuthorized.value = false;
      return;
    }

    const section = routeSection();
    setActiveSection(section);

    if (isAuthorized.value && connectionForm.profileId === profileId) {
      await refreshSnapshot();
      return;
    }

    const profile = profiles.value.find((item) => item.id === profileId);
    if (!profile) {
      isAuthorized.value = false;
      lastError.value = "Profile not found.";
      profileStorage.clearActiveProfile();
      loadProfile(newProfileId);
      await router.replace({ name: "login" });
      return;
    }

    await authorizeProfile(profile, section);
    if (!isAuthorized.value) {
      const errorMessage = lastError.value;
      await router.replace({ name: "login" });
      lastError.value = errorMessage;
    }
  } finally {
    if (generation === profileRouteSyncGeneration) {
      isRestoringSession.value = false;
    }
  }
}

async function addProfile() {
  const nextSettings = formConnectionSettings();
  isConnecting.value = true;
  lastError.value = "";
  connectionForm.mode = nextSettings.mode;

  try {
    await fetchSnapshot(createClient(nextSettings));
    persistConnection();
    connectionDialogOpen.value = false;
  } catch (error) {
    profileValidationError.value = error instanceof Error ? error.message : String(error);
    profileValidationDialogOpen.value = true;
  } finally {
    isConnecting.value = false;
  }
}

function reviewProfileConnection() {
  lastError.value = profileValidationError.value;
  profileValidationDialogOpen.value = false;
}

function continueAddingProfile() {
  persistConnection();
  profileValidationDialogOpen.value = false;
  profileValidationError.value = "";
  lastError.value = "";
  connectionDialogOpen.value = false;
}

function logout() {
  profileStorage.clearActiveProfile();

  stopHealthProbe();
  isAuthorized.value = false;
  connectionDialogOpen.value = false;
  lastError.value = "";
  Object.assign(connectionForm, {
    ...defaultConnectionForm(),
    profileId: connectionForm.profileId,
    profileName: connectionForm.profileName,
    mode: settings.mode,
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    remember: false,
  });
  void router.push({ name: "login" });
}

function requestDeleteProfile(profile: ConnectionProfile) {
  pendingDeleteProfile.value = profile;
}

function handleDeleteProfileDialogOpen(open: boolean) {
  if (!open) {
    window.setTimeout(() => {
      pendingDeleteProfile.value = null;
    }, 0);
  }
}

function confirmDeleteProfile() {
  const profileId = pendingDeleteProfile.value?.id;
  pendingDeleteProfile.value = null;
  if (!profileId) {
    return;
  }
  deleteProfile(profileId);
}

function deleteProfile(profileId: string) {
  if (profileId === newProfileId) {
    return;
  }

  profiles.value = profiles.value.filter((profile) => profile.id !== profileId);
  profileStorage.deleteProfile(profileId);
  reloadProfiles();

  if (connectionForm.profileId === profileId) {
    loadProfile(profiles.value[0]?.id ?? newProfileId);
  }

  if (routeProfileId() === profileId) {
    void router.push({ name: "login" });
  }
}

async function switchAuthorizedProfile(profile: ConnectionProfile) {
  await authorizeProfile(profile, activeSection.value);
  if (isAuthorized.value) {
    await pushProfileRoute(profile.id, activeSection.value);
  }
}

function selectSection(section: ProductSection) {
  setActiveSection(section);

  if (isAuthorized.value && connectionForm.profileId !== newProfileId) {
    void pushProfileRoute(connectionForm.profileId, section);
  }
}

function openInviteDialog() {
  inviteDialogRefreshGeneration += 1;
  const generation = inviteDialogRefreshGeneration;
  inviteDialogOpen.value = true;
  void refreshOpenInviteDialog(generation);
}

function openInviteDialogFromDeviceSetup() {
  returnToDeviceSetupAfterInvite.value = true;
  addDeviceStep.value = "generate";
  deviceSetupDialogOpen.value = false;
  openInviteDialog();
}

function handleInviteDialogOpen(open: boolean) {
  inviteDialogOpen.value = open;
  if (!open) {
    inviteDialogRefreshGeneration += 1;
    if (returnToDeviceSetupAfterInvite.value) {
      returnToDeviceSetupAfterInvite.value = false;
      deviceSetupDialogOpen.value = deviceSetupTask.value !== null;
    }
  }
}

function openMemberDialog() {
  memberDialogRefreshGeneration += 1;
  const generation = memberDialogRefreshGeneration;
  memberDialogOpen.value = true;
  void refreshOpenMemberDialog(generation);
}

function handleMemberDialogOpen(open: boolean) {
  memberDialogOpen.value = open;
  if (!open) {
    memberDialogRefreshGeneration += 1;
  }
}

function firstVisibleUserId() {
  return visibleUsers.value[0]?.id ?? "";
}

function ensureWorkflowUser() {
  const fallback = firstVisibleUserId();
  if (!pendingRegistrationForm.user && fallback) {
    pendingRegistrationForm.user = fallback;
  }
  if (!inviteForm.user && fallback) {
    inviteForm.user = fallback;
  }
}

function openServerSettings() {
  profileMenuOpen.value = false;
  serverSettingsTab.value = "apiKeys";
  serverSettingsDialogOpen.value = true;
  createdApiKey.value = "";
}

function handleServerSettingsOpen(open: boolean) {
  serverSettingsDialogOpen.value = open;
  if (!open) {
    createdApiKey.value = "";
    backfillNodeIpsResult.value = "";
  }
}

function changeServerSettingsTab(nextTab: string) {
  if (nextTab === "apiKeys" || nextTab === "maintenance") {
    serverSettingsTab.value = nextTab;
  }
}

function changeSection(nextSection: string) {
  if (productSections.includes(nextSection as ProductSection)) {
    selectSection(nextSection as ProductSection);
  }
}

function changePolicyTab(nextTab: string) {
  if (["rules", "groups", "tags", "review"].includes(nextTab)) {
    activePolicyTab.value = nextTab as PolicyWorkspaceTab;
  }
}

function changeLocale(nextLocale: string) {
  if (SUPPORTED_LOCALES.includes(nextLocale as Locale)) {
    setLocale(nextLocale as Locale);
  }
}

function changeTheme(nextTheme: string) {
  if (isThemeMode(nextTheme)) {
    colorMode.value = nextTheme;
  }
}

function chooseLocale(option: Locale) {
  changeLocale(option);
  profileMenuOpen.value = false;
}

function chooseTheme(mode: ThemeMode) {
  changeTheme(mode);
  profileMenuOpen.value = false;
}

function logoutFromMenu() {
  profileMenuOpen.value = false;
  logout();
}

function formatDate(value?: string) {
  if (!value) {
    return "never";
  }

  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return value;
  }

  return new Intl.DateTimeFormat(locale.value, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));
}

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToText(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
}

function createPolicyId() {
  return crypto.randomUUID();
}

function policyChoiceId(slot: PolicyBuilderSlot, value: string) {
  const normalized = value
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${slot}-${normalized || "any"}`;
}

function policyChoicesForSlot(slot: PolicyBuilderSlot) {
  if (slot === "source") {
    return policySourceChoices.value;
  }
  if (slot === "destination") {
    return policyDestinationChoices.value;
  }
  return policyServiceChoices.value;
}

function policyChoiceLabel(slot: PolicyBuilderSlot, value: string) {
  return policyChoicesForSlot(slot).find((choice) => choice.value === value)?.label || value;
}

function policyRuleSentence(source: string, destination: string, ports: string) {
  const sourceLabel = policyChoiceLabel("source", source);
  const destinationLabel = policyChoiceLabel("destination", destination);
  const serviceLabel = policyChoiceLabel("ports", ports);

  if (source === "*" && destination === "*" && ports === "*") {
    if (locale.value === "zh") {
      return "高风险：所有来源可以访问所有设备的所有服务。";
    }

    if (locale.value === "ar") {
      return "مخاطرة عالية: يمكن للجميع الوصول إلى كل جهاز عبر كل الخدمات.";
    }

    return "High risk: everyone can reach every device on every service.";
  }

  if (locale.value === "zh") {
    return `允许 ${sourceLabel} 访问 ${destinationLabel} 的 ${serviceLabel}。`;
  }

  if (locale.value === "ar") {
    return `السماح لـ ${sourceLabel} بالوصول إلى ${destinationLabel} عبر ${serviceLabel}.`;
  }

  return `Allow ${sourceLabel} to reach ${destinationLabel} on ${serviceLabel}.`;
}

function isPolicyRuleHighRisk(rule: Pick<PolicyRule, "source" | "destination" | "ports">) {
  return rule.source.trim() === "*" && rule.destination.trim() === "*" && rule.ports.trim() === "*";
}

function addUniqueCommaValue(current: string, value: string) {
  return Array.from(new Set([...parseCommaList(current), value])).join(", ");
}

function addSelectedPolicyGroupMember() {
  const value = policyGroupMemberSelection.value || policyMemberChoices.value[0]?.value || "";
  if (!value) {
    return;
  }

  policyGroupForm.members = addUniqueCommaValue(policyGroupForm.members, value);
  policyGroupMemberSelection.value = "";
}

function addSelectedPolicyTagOwner() {
  const value = policyTagOwnerSelection.value || policyOwnerChoices.value[0]?.value || "";
  if (!value) {
    return;
  }

  policyTagOwnerForm.owners = addUniqueCommaValue(policyTagOwnerForm.owners, value);
  policyTagOwnerSelection.value = "";
}

function destinationParts(value: unknown) {
  const destinations = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? [value]
      : ["*:*"];
  const first = destinations[0] ?? "*:*";
  const separator = first.lastIndexOf(":");

  if (separator <= 0) {
    return {
      destination: first,
      ports: "*",
    };
  }

  return {
    destination: first.slice(0, separator),
    ports: first.slice(separator + 1) || "*",
  };
}

function parsePolicyDestinations(destination: string, ports: string) {
  const resolvedPorts = ports.trim() || "*";
  return parseCommaList(destination || "*").map((target) => `${target}:${resolvedPorts}`);
}

function loadPolicyDesigner(policy: string) {
  try {
    const parsed = JSON.parse(policy) as {
      acls?: Array<{ action?: string; src?: unknown; dst?: unknown }>;
      groups?: Record<string, unknown>;
      tagOwners?: Record<string, unknown>;
      [key: string]: unknown;
    };
    const { acls, groups, tagOwners, ...extraSections } = parsed;

    policyExtraSections.value = extraSections;
    policyRules.value = (acls ?? []).map((rule) => {
      const destination = destinationParts(rule.dst);
      return {
        id: createPolicyId(),
        action: "accept",
        source: listToText(rule.src) || "*",
        destination: destination.destination || "*",
        ports: destination.ports || "*",
      };
    });
    policyGroups.value = Object.entries(groups ?? {}).map(([name, members]) => ({
      id: createPolicyId(),
      name,
      members: listToText(members),
    }));
    policyTagOwners.value = Object.entries(tagOwners ?? {}).map(([tag, owners]) => ({
      id: createPolicyId(),
      tag,
      owners: listToText(owners),
    }));
  } catch {
    policyRules.value = [];
    policyGroups.value = [];
    policyTagOwners.value = [];
    policyExtraSections.value = {};
  }

  if (policyRules.value.length === 0) {
    policyRules.value = [
      {
        id: createPolicyId(),
        action: "accept",
        source: "*",
        destination: "*",
        ports: "*",
      },
    ];
  }
}

function nodeOwner(node: HeadscaleNode) {
  if (!hasVisibleUser(node.user)) {
    return "";
  }

  return userLabel(node.user);
}

function userDeviceCount(user: HeadscaleUser) {
  return snapshot.value.nodes.filter((node) => node.user?.id === user.id).length;
}

function userRole(user: HeadscaleUser) {
  if (userAuthSource(user).toLowerCase() === "system" || user.name.includes("tagged")) {
    return "Service account";
  }
  if (user.id === "1") {
    return "Owner";
  }
  return "Member";
}

function userAuthSource(user: HeadscaleUser) {
  return user.provider || user.providerId || "-";
}

function userLabel(user?: HeadscaleUser) {
  return user?.displayName || user?.name || user?.email || "Unknown";
}

function hasVisibleUser(user?: HeadscaleUser): user is HeadscaleUser {
  return Boolean(user && !isTagManagedDeviceUser(user));
}

function isTagManagedDeviceUser(user?: HeadscaleUser) {
  return user?.name === "tagged-devices";
}

function nodePendingRoutes(node: HeadscaleNode) {
  return node.availableRoutes.filter((route) => !node.approvedRoutes.includes(route));
}

function userDevices(user: HeadscaleUser) {
  return snapshot.value.nodes.filter(
    (node) => hasVisibleUser(node.user) && node.user.id === user.id,
  );
}

function activeAuthKeysForUser(user: HeadscaleUser) {
  return snapshot.value.preAuthKeys.filter(
    (key) => key.user?.id === user.id && !key.used && !isExpired(key.expiration),
  );
}

function userPolicyPrincipals(user: HeadscaleUser) {
  return [user.email, user.name].filter((value): value is string => Boolean(value));
}

function userPolicyReferences(user: HeadscaleUser) {
  const principals = userPolicyPrincipals(user);
  const groupReferences = policyGroups.value
    .filter((group) => parseCommaList(group.members).some((member) => principals.includes(member)))
    .map((group) => `${copy.value.groups}: ${group.name}`);
  const tagOwnerReferences = policyTagOwners.value
    .filter((tagOwner) =>
      parseCommaList(tagOwner.owners).some((owner) => principals.includes(owner)),
    )
    .map((tagOwner) => `${copy.value.tagOwners}: ${tagOwner.tag}`);

  return [...groupReferences, ...tagOwnerReferences];
}

function shortSecret(value?: string) {
  if (!value) {
    return copy.value.unknown;
  }
  if (value.length <= 18) {
    return value;
  }
  return `${value.slice(0, 12)}...${value.slice(-4)}`;
}

function jumpToMachine(node: HeadscaleNode) {
  deviceSearch.value = node.givenName || node.name;
  machineFilter.value = "all";
  selectSection("devices");
}

function jumpToMachinesForUser(user: HeadscaleUser) {
  deviceSearch.value = user.email || user.name || userLabel(user);
  machineFilter.value = "all";
  handleUserDetailsOpen(false);
  selectSection("devices");
}

function jumpToUser(user?: HeadscaleUser) {
  if (!hasVisibleUser(user)) {
    return;
  }

  userSearch.value = user.email || userLabel(user);
  userFilter.value = "all";
  selectSection("members");
}

function openNodeDetails(node: HeadscaleNode) {
  nodeDetailRefreshGeneration += 1;
  const generation = nodeDetailRefreshGeneration;
  handleUserDetailsOpen(false);
  selectedDetailNode.value = node;
  void refreshNodeDetail(node.id, generation);
}

function openUserDetails(user?: HeadscaleUser) {
  if (!hasVisibleUser(user)) {
    return;
  }

  userDetailRefreshGeneration += 1;
  const generation = userDetailRefreshGeneration;
  handleNodeDetailsOpen(false);
  selectedDetailUser.value = user;
  void refreshUserDetail(user.id, generation);
}

function handleNodeDetailsOpen(open: boolean) {
  if (!open) {
    nodeDetailRefreshGeneration += 1;
    selectedDetailNode.value = null;
  }
}

function handleUserDetailsOpen(open: boolean) {
  if (!open) {
    userDetailRefreshGeneration += 1;
    selectedDetailUser.value = null;
  }
}

function openInviteDialogForUser(user: HeadscaleUser) {
  inviteDialogRefreshGeneration += 1;
  const generation = inviteDialogRefreshGeneration;
  inviteForm.user = user.id;
  handleUserDetailsOpen(false);
  inviteDialogOpen.value = true;
  void refreshOpenInviteDialog(generation);
}

function openRenameDialogFromDetails(node: HeadscaleNode) {
  handleNodeDetailsOpen(false);
  openRenameDialog(node);
}

function openExpireDialogFromDetails(node: HeadscaleNode) {
  handleNodeDetailsOpen(false);
  openExpireDialog(node);
}

function openRemoveDialogFromDetails(node: HeadscaleNode) {
  handleNodeDetailsOpen(false);
  openRemoveDialog(node);
}

function jumpToRoutesFromDetails(node: HeadscaleNode) {
  handleNodeDetailsOpen(false);
  void jumpToRoutesForMachine(node);
}

async function jumpToRoutesForMachine(node: HeadscaleNode) {
  selectSection("routes");
  await nextTick();
  document.querySelector<HTMLElement>(`[data-testid="route-node-${node.id}"]`)?.scrollIntoView({
    block: "center",
    inline: "nearest",
  });
}

function isExitRoute(route: string) {
  return route === "0.0.0.0/0" || route === "::/0";
}

function nodeStatusLabel(node: HeadscaleNode) {
  const status = nodeConnectionStatus(node);
  if (status === "expired") {
    return copy.value.expiredOnly;
  }
  return status === "online" ? t("online") : t("offline");
}

function nodeStatusClass(node: HeadscaleNode) {
  const status = nodeConnectionStatus(node);
  if (status === "online") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (status === "expired") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300";
  }
  return "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300";
}

function keyStatus(key: PreAuthKey) {
  if (key.used) {
    return copy.value.used;
  }
  if (isExpired(key.expiration)) {
    return t("disconnected");
  }
  return copy.value.unused;
}

function keyStatusClass(key: PreAuthKey) {
  if (key.used) {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300";
  }
  if (isExpired(key.expiration)) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
}

function keyKindClass(key: PreAuthKey) {
  if (key.reusable) {
    return "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300";
  }
  return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300";
}

function keyEphemeralClass() {
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
}

function deviceTagClass(tag: string) {
  const normalizedTag = tag.toLowerCase();
  if (normalizedTag.includes("server")) {
    return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300";
  }
  if (normalizedTag.includes("workstation") || normalizedTag.includes("desktop")) {
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/40 dark:text-fuchsia-300";
  }
  if (normalizedTag.includes("mobile") || normalizedTag.includes("phone")) {
    return "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-300";
  }
  if (normalizedTag.includes("db") || normalizedTag.includes("database")) {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
}

function pendingRouteClass(route: string) {
  if (isExitRoute(route)) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
}

function approvedRouteClass() {
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
}

function keyTagClass(tag: string) {
  const normalizedTag = tag.toLowerCase();
  if (normalizedTag.includes("server")) {
    return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300";
  }
  if (normalizedTag.includes("mobile")) {
    return "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-300";
  }
  if (normalizedTag.includes("db")) {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300";
}

function csvCell(value: string | number | boolean | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(
  fileName: string,
  rows: Array<Record<string, string | number | boolean | undefined>>,
) {
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function exportMachines() {
  downloadCsv(
    "headscale-machines.csv",
    filteredNodes.value.map((node) => ({
      name: node.name,
      owner: nodeOwner(node),
      status: nodeStatusLabel(node),
      addresses: node.ipAddresses.join(" "),
      tags: node.tags.join(" "),
      routes: node.approvedRoutes.join(" "),
      lastSeen: node.lastSeen,
      expires: node.expiry,
    })),
  );
}

function exportUsers() {
  downloadCsv(
    "headscale-users.csv",
    filteredUsers.value.map((user) => ({
      name: userLabel(user),
      email: user.email,
      role: userRole(user),
      provider: userAuthSource(user),
      machines: userDeviceCount(user),
      joined: user.createdAt,
    })),
  );
}

function clearMachineFilters() {
  deviceSearch.value = "";
  machineFilter.value = "all";
}

function syncInviteExpirationFromDays() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + authKeyExpiryDays.value);
  inviteForm.expiration = expiresAt.toISOString();
}

function setAuthKeyExpiryDays(value: number) {
  const nextValue = Number.isFinite(value) ? value : 7;
  authKeyExpiryDays.value = Math.min(90, Math.max(1, Math.round(nextValue)));
  syncInviteExpirationFromDays();
}

function goToNextAddDeviceStep() {
  if (!canMoveAddDeviceNext.value) {
    return;
  }

  addDeviceStep.value =
    addDeviceSteps.value[addDeviceStepIndex.value + 1]?.id ?? addDeviceStep.value;
}

function goToPreviousAddDeviceStep() {
  if (addDeviceStepIndex.value <= 0) {
    deviceSetupTask.value = null;
    addDeviceStep.value = "type";
    lastCreatedInvite.value = "";
    lastRegisteredNode.value = null;
    authRequestResult.value = "";
    return;
  }

  addDeviceStep.value = addDeviceSteps.value[addDeviceStepIndex.value - 1]?.id ?? "type";
}

function goToAddDeviceStep(index: number) {
  if (index > addDeviceStepIndex.value) {
    return;
  }

  addDeviceStep.value = addDeviceSteps.value[index]?.id ?? addDeviceStep.value;
}

function finishAddDeviceFlow() {
  handleDeviceSetupDialogOpen(false);
}

function isAddDeviceStepComplete(index: number) {
  return index < addDeviceStepIndex.value;
}

function openDeviceSetupDialog() {
  deviceSetupTask.value = null;
  addDeviceStep.value = "type";
  lastCreatedInvite.value = "";
  lastRegisteredNode.value = null;
  authRequestResult.value = "";
  deviceSetupDialogOpen.value = true;
  selectSection("devices");
}

function prepareDeviceInvite(task: AddDeviceTask) {
  if (task === "pending") {
    preparePendingRegistration();
    return;
  }

  deviceSetupTask.value = task;
  addDeviceStep.value = "preferences";
  deviceSetupDialogOpen.value = true;
  inviteForm.reusable = task === "server";
  inviteForm.ephemeral = task === "client";
  inviteForm.aclTags = task === "server" ? "tag:server" : "";
  ensureWorkflowUser();
  setAuthKeyExpiryDays(7);
  lastCreatedInvite.value = "";
  lastRegisteredNode.value = null;
  authRequestResult.value = "";
  selectSection("devices");
}

function preparePendingRegistration() {
  deviceSetupTask.value = "pending";
  addDeviceStep.value = "pending";
  deviceSetupDialogOpen.value = true;
  ensureWorkflowUser();
  lastCreatedInvite.value = "";
  lastRegisteredNode.value = null;
  authRequestResult.value = "";
  selectSection("devices");
}

function handleDeviceSetupDialogOpen(open: boolean) {
  deviceSetupDialogOpen.value = open;
  if (!open) {
    returnToDeviceSetupAfterInvite.value = false;
    deviceSetupTask.value = null;
    addDeviceStep.value = "type";
    lastCreatedInvite.value = "";
    lastRegisteredNode.value = null;
    authRequestResult.value = "";
  }
}

function openAccessFromDeviceSetup() {
  handleDeviceSetupDialogOpen(false);
  selectSection("access");
}

function openPolicyRuleDialog() {
  policyRuleDialogOpen.value = true;
}

function handlePolicyRuleDialogOpen(open: boolean) {
  policyRuleDialogOpen.value = open;
}

function openPolicyGroupDialog() {
  policyGroupDialogOpen.value = true;
}

function handlePolicyGroupDialogOpen(open: boolean) {
  policyGroupDialogOpen.value = open;
}

function openPolicyTagOwnerDialog() {
  policyTagOwnerDialogOpen.value = true;
}

function handlePolicyTagOwnerDialogOpen(open: boolean) {
  policyTagOwnerDialogOpen.value = open;
}

function addPolicyRule() {
  policyRules.value = [
    ...policyRules.value,
    {
      id: createPolicyId(),
      action: "accept",
      source: policyRuleForm.source || "*",
      destination: policyRuleForm.destination || "*",
      ports: policyRuleForm.ports || "*",
    },
  ];
  handlePolicyRuleDialogOpen(false);
}

function requestRemovePolicyRule(rule: PolicyRule) {
  pendingPolicyRemoval.value = {
    kind: "rule",
    id: rule.id,
    label: policyRuleSentence(rule.source, rule.destination, rule.ports),
  };
  policyRemovalDialogOpen.value = true;
}

function removePolicyRule(id: string) {
  policyRules.value = policyRules.value.filter((rule) => rule.id !== id);
}

function addPolicyGroup() {
  const name = policyGroupForm.name.trim();
  if (!name) {
    return;
  }

  policyGroups.value = [
    ...policyGroups.value.filter((group) => group.name !== name),
    {
      id: createPolicyId(),
      name,
      members: policyGroupForm.members,
    },
  ];
  handlePolicyGroupDialogOpen(false);
}

function requestRemovePolicyGroup(group: PolicyGroup) {
  pendingPolicyRemoval.value = {
    kind: "group",
    id: group.id,
    label: group.name,
  };
  policyRemovalDialogOpen.value = true;
}

function removePolicyGroup(id: string) {
  policyGroups.value = policyGroups.value.filter((group) => group.id !== id);
}

function addPolicyTagOwner() {
  const tag = policyTagOwnerForm.tag.trim();
  if (!tag) {
    return;
  }

  policyTagOwners.value = [
    ...policyTagOwners.value.filter((tagOwner) => tagOwner.tag !== tag),
    {
      id: createPolicyId(),
      tag,
      owners: policyTagOwnerForm.owners,
    },
  ];
  handlePolicyTagOwnerDialogOpen(false);
}

function requestRemovePolicyTagOwner(tagOwner: PolicyTagOwner) {
  pendingPolicyRemoval.value = {
    kind: "tagOwner",
    id: tagOwner.id,
    label: tagOwner.tag,
  };
  policyRemovalDialogOpen.value = true;
}

function removePolicyTagOwner(id: string) {
  policyTagOwners.value = policyTagOwners.value.filter((tagOwner) => tagOwner.id !== id);
}

function handlePolicyRemovalDialogOpen(open: boolean) {
  policyRemovalDialogOpen.value = open;
  if (open) {
    return;
  }

  window.setTimeout(() => {
    if (!policyRemovalDialogOpen.value) {
      pendingPolicyRemoval.value = null;
    }
  });
}

function confirmRemovePolicyItem() {
  const target = pendingPolicyRemoval.value;
  if (!target) {
    return;
  }

  if (target.kind === "rule") {
    removePolicyRule(target.id);
  }

  if (target.kind === "group") {
    removePolicyGroup(target.id);
  }

  if (target.kind === "tagOwner") {
    removePolicyTagOwner(target.id);
  }

  pendingPolicyRemoval.value = null;
  policyRemovalDialogOpen.value = false;
}

async function mutate(action: (client: HeadscaleClient) => Promise<unknown>) {
  lastError.value = "";
  try {
    await action(createClient());
    await refreshSnapshot();
    return true;
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : String(error);
    return false;
  }
}

async function registerPendingNode() {
  lastError.value = "";
  lastRegisteredNode.value = null;
  authRequestResult.value = "";
  try {
    const response = await createClient().registerNode({
      user: pendingRegistrationForm.user,
      key: pendingRegistrationForm.key,
    });
    lastRegisteredNode.value = response.node;
    addDeviceStep.value = "result";
    await refreshSnapshot();
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : String(error);
  }
}

async function registerAuthRequest() {
  lastError.value = "";
  authRequestResult.value = "";
  try {
    const response = await createClient().authRegister({
      user: pendingRegistrationForm.user,
      authId: pendingRegistrationForm.authId,
    });
    lastRegisteredNode.value = response.node;
    authRequestResult.value = copy.value.registerAuthRequest;
    addDeviceStep.value = "result";
    await refreshSnapshot();
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : String(error);
  }
}

async function approveAuthRequest() {
  const approved = await mutate((client) =>
    client.authApprove({ authId: pendingRegistrationForm.authId }),
  );
  if (approved) {
    authRequestResult.value = copy.value.approveAuthRequest;
    addDeviceStep.value = "result";
  }
}

async function rejectAuthRequest() {
  const rejected = await mutate((client) =>
    client.authReject({ authId: pendingRegistrationForm.authId }),
  );
  if (rejected) {
    authRequestResult.value = copy.value.rejectAuthRequest;
    addDeviceStep.value = "result";
  }
}

function openTagsDialog(node: HeadscaleNode) {
  selectedTagsNode.value = node;
  tagsForm.tags = node.tags.join(", ");
}

function handleTagsDialogOpen(open: boolean) {
  if (!open) {
    selectedTagsNode.value = null;
    tagsForm.tags = "";
  }
}

async function confirmSetNodeTags() {
  const node = selectedTagsNode.value;
  if (!node) {
    return;
  }

  const updated = await mutate((client) =>
    client.setTags({
      nodeId: node.id,
      tags: tagsForm.tags,
    }),
  );
  if (updated) {
    handleTagsDialogOpen(false);
  }
}

function openRenameMemberDialog(user: HeadscaleUser) {
  selectedRenameUser.value = user;
  renameMemberForm.name = user.name;
}

function handleRenameMemberDialogOpen(open: boolean) {
  if (!open) {
    selectedRenameUser.value = null;
    renameMemberForm.name = "";
  }
}

async function confirmRenameMember() {
  const user = selectedRenameUser.value;
  if (!user) {
    return;
  }

  const renamed = await mutate((client) =>
    client.renameUser({
      id: user.id,
      newName: renameMemberForm.name,
    }),
  );
  if (renamed) {
    handleRenameMemberDialogOpen(false);
  }
}

function requestDeleteMember(user: HeadscaleUser) {
  pendingDeleteUser.value = user;
}

function handleDeleteMemberDialogOpen(open: boolean) {
  if (!open) {
    pendingDeleteUser.value = null;
  }
}

async function confirmDeleteMember() {
  const user = pendingDeleteUser.value;
  if (!user) {
    return;
  }

  const deleted = await mutate((client) => client.deleteUser({ id: user.id }));
  if (deleted) {
    handleDeleteMemberDialogOpen(false);
  }
}

function requestInviteAction(kind: InviteActionTarget["kind"], key: PreAuthKey) {
  pendingInviteAction.value = { kind, key };
}

function handleInviteActionDialogOpen(open: boolean) {
  if (!open) {
    pendingInviteAction.value = null;
  }
}

async function confirmInviteAction() {
  const target = pendingInviteAction.value;
  if (!target) {
    return;
  }

  const completed = await mutate((client) =>
    target.kind === "expire"
      ? client.expirePreAuthKey({ id: target.key.id })
      : client.deletePreAuthKey({ id: target.key.id }),
  );
  if (completed) {
    handleInviteActionDialogOpen(false);
  }
}

function requestApiKeyAction(kind: ApiKeyActionTarget["kind"], key: ApiKey) {
  pendingApiKeyAction.value = { kind, key };
}

function handleApiKeyActionDialogOpen(open: boolean) {
  if (!open) {
    pendingApiKeyAction.value = null;
  }
}

async function createServerApiKey() {
  lastError.value = "";
  createdApiKey.value = "";
  try {
    const response = await createClient().createApiKey({
      expiration: apiKeyForm.expiration,
    });
    createdApiKey.value = response.apiKey;
    await refreshSnapshot();
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : String(error);
  }
}

async function confirmApiKeyAction() {
  const target = pendingApiKeyAction.value;
  if (!target) {
    return;
  }

  const completed = await mutate((client) =>
    target.kind === "expire"
      ? client.expireApiKey({ prefix: target.key.prefix, id: target.key.id })
      : client.deleteApiKey({ prefix: target.key.prefix, id: target.key.id }),
  );
  if (completed) {
    handleApiKeyActionDialogOpen(false);
  }
}

function openBackfillNodeIpsDialog() {
  backfillNodeIpsConfirmed.value = false;
  backfillNodeIpsResult.value = "";
  backfillNodeIpsDialogOpen.value = true;
}

function handleBackfillNodeIpsDialogOpen(open: boolean) {
  backfillNodeIpsDialogOpen.value = open;
  if (!open) {
    backfillNodeIpsConfirmed.value = false;
  }
}

async function confirmBackfillNodeIps() {
  lastError.value = "";
  backfillNodeIpsResult.value = "";
  try {
    const response = await createClient().backfillNodeIps({ confirmed: true });
    backfillNodeIpsResult.value = response.changes.join(", ") || copy.value.readyToSave;
    await refreshSnapshot();
    handleBackfillNodeIpsDialogOpen(false);
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : String(error);
  }
}

function requestApproveRoutes(node: HeadscaleNode) {
  selectedRoutesApprovalNode.value = node;
}

function handleApproveRoutesDialogOpen(open: boolean) {
  if (!open) {
    selectedRoutesApprovalNode.value = null;
  }
}

async function confirmApproveRoutes() {
  const node = selectedRoutesApprovalNode.value;
  if (!node) {
    return;
  }

  await approveRoutes(node);
  handleApproveRoutesDialogOpen(false);
}

async function createMember() {
  const created = await mutate((client) =>
    client.createUser({
      name: memberForm.name,
      displayName: memberForm.displayName,
      email: memberForm.email,
    }),
  );
  if (!created) {
    return;
  }

  memberForm.name = "";
  memberForm.displayName = "";
  memberForm.email = "";
  handleMemberDialogOpen(false);
}

async function createInvite(payload: AuthKeyDialogPayload) {
  inviteForm.user = payload.user;
  inviteForm.reusable = payload.reusable;
  inviteForm.ephemeral = payload.ephemeral;
  inviteForm.expiration = payload.expiration;
  inviteForm.aclTags = payload.aclTags;
  lastCreatedInvite.value = "";
  lastError.value = "";
  isCreatingInvite.value = true;
  try {
    const response = await createClient().createPreAuthKey({
      user: payload.user,
      reusable: payload.reusable,
      ephemeral: payload.ephemeral,
      expiration: payload.expiration,
      aclTags: payload.aclTags,
    });
    lastCreatedInvite.value = response.preAuthKey.key;
    addDeviceStep.value = "generate";
    await refreshSnapshot();
    handleInviteDialogOpen(false);
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isCreatingInvite.value = false;
  }
}

async function renameNode(node: HeadscaleNode) {
  await mutate((client) =>
    client.renameNode({
      nodeId: node.id,
      newName: renameDrafts[node.id] || node.name,
    }),
  );
}

async function expireNode(node: HeadscaleNode) {
  await mutate((client) =>
    client.expireNode({ nodeId: node.id, expiry: new Date().toISOString() }),
  );
}

async function deleteNode(node: HeadscaleNode) {
  await mutate((client) => client.deleteNode({ nodeId: node.id }));
}

function handleRenameDialogOpen(open: boolean) {
  renameDialogOpen.value = open;
  if (!open) {
    renameDialogRefreshGeneration += 1;
    selectedRenameNode.value = null;
  }
}

function handleExpireDialogOpen(open: boolean) {
  expireDialogOpen.value = open;
  if (!open) {
    expireDialogRefreshGeneration += 1;
    selectedExpireNode.value = null;
  }
}

function handleRemoveDialogOpen(open: boolean) {
  removeDialogOpen.value = open;
  if (!open) {
    removeDialogRefreshGeneration += 1;
    selectedRemoveNode.value = null;
  }
}

function handleRouteApprovalDialogOpen(open: boolean) {
  routeApprovalDialogOpen.value = open;
  if (!open) {
    routeApprovalRefreshGeneration += 1;
    selectedRouteApproval.value = null;
  }
}

function openRenameDialog(node: HeadscaleNode) {
  renameDialogRefreshGeneration += 1;
  const generation = renameDialogRefreshGeneration;
  const draftAtOpen = node.givenName || node.name;
  selectedRenameNode.value = node;
  renameDrafts[node.id] = draftAtOpen;
  renameDialogOpen.value = true;
  void refreshRenameDialogNode(node.id, generation, draftAtOpen);
}

function openExpireDialog(node: HeadscaleNode) {
  expireDialogRefreshGeneration += 1;
  const generation = expireDialogRefreshGeneration;
  selectedExpireNode.value = node;
  expireDialogOpen.value = true;
  void refreshExpireDialogNode(node.id, generation);
}

function openRemoveDialog(node: HeadscaleNode) {
  removeDialogRefreshGeneration += 1;
  const generation = removeDialogRefreshGeneration;
  selectedRemoveNode.value = node;
  removeDialogOpen.value = true;
  void refreshRemoveDialogNode(node.id, generation);
}

function openRouteApprovalDialog(node: HeadscaleNode, route: string) {
  routeApprovalRefreshGeneration += 1;
  const generation = routeApprovalRefreshGeneration;
  selectedRouteApproval.value = { node, route };
  routeApprovalDialogOpen.value = true;
  void refreshRouteApprovalTarget(node.id, route, generation);
}

function approvedRoutesWith(node: HeadscaleNode, route: string) {
  return Array.from(new Set([...node.approvedRoutes, route]));
}

async function confirmRenameNode() {
  const node = selectedRenameNode.value;
  if (!node) {
    return;
  }

  await renameNode(node);
  handleRenameDialogOpen(false);
}

async function confirmExpireNode() {
  const node = selectedExpireNode.value;
  if (!node) {
    return;
  }

  await expireNode(node);
  handleExpireDialogOpen(false);
}

async function confirmRemoveNode() {
  const node = selectedRemoveNode.value;
  if (!node) {
    return;
  }

  await deleteNode(node);
  handleRemoveDialogOpen(false);
}

async function confirmApproveRoute() {
  const target = selectedRouteApproval.value;
  if (!target) {
    return;
  }

  await mutate((client) =>
    client.setApprovedRoutes({
      nodeId: target.node.id,
      routes: approvedRoutesWith(target.node, target.route).join(","),
    }),
  );
  handleRouteApprovalDialogOpen(false);
}

async function approveRoutes(node: HeadscaleNode) {
  await mutate((client) =>
    client.setApprovedRoutes({
      nodeId: node.id,
      routes: node.availableRoutes.join(","),
    }),
  );
}

async function savePolicy() {
  policyDraft.value = JSON.stringify(policyPayload.value, null, 2);
  await mutate((client) => client.setPolicy({ policy: policyDraft.value }));
}

async function copyInviteKey(value: string) {
  await navigator.clipboard.writeText(value);
  copiedKey.value = value;
  window.setTimeout(() => {
    copiedKey.value = "";
  }, 1200);
}

function scrollActiveTabIntoView() {
  void nextTick(() => {
    const activeTab = document.querySelector<HTMLElement>(
      `[data-testid="section-${activeSection.value}"]`,
    );
    activeTab?.scrollIntoView({ block: "nearest", inline: "center" });
  });
}

function openProfileSubmenu(menu: ProfileSubmenu) {
  profileSubmenu.value = menu;
}

function keepProfileSubmenuOpen(menu: ProfileSubmenu, isOpen: boolean) {
  if (isOpen) {
    openProfileSubmenu(menu);
  }
}

watchEffect(() => {
  applyThemeMode(colorMode.value);
});

watch(profileMenuOpen, (isOpen) => {
  if (!isOpen) {
    profileSubmenu.value = null;
  }
});

watch(
  () => [route.params.profileId, route.params.group],
  () => {
    void syncProfileRoute();
  },
  { immediate: true },
);

watch(
  () => [isAuthorized.value, settings.mode, settings.baseUrl, settings.apiKey],
  restartHealthProbe,
  { immediate: true },
);

watch(activeSection, scrollActiveTabIntoView, { immediate: true });

onBeforeUnmount(stopHealthProbe);
</script>

<template>
  <main class="min-h-screen bg-background">
    <section v-if="isProfileRoute && isRestoringSession && !isAuthorized" class="flex min-h-screen items-center justify-center px-4" data-testid="session-restore">
      <div class="grid justify-items-center gap-4 text-center text-sm text-muted-foreground">
        <div class="relative flex h-16 w-16 items-center justify-center rounded-full border bg-card shadow-sm">
          <HeadscaleLogo class="h-9 w-9 opacity-60" />
          <LoaderCircle class="absolute h-16 w-16 animate-spin text-primary" aria-hidden="true" />
        </div>
        <div class="grid gap-1">
          <p class="font-medium text-foreground">{{ restoringProfile?.name ?? t("profile") }}</p>
          <p>{{ t("checkingCredentials") }}</p>
        </div>
      </div>
    </section>

    <section v-else-if="!isAuthorized" class="min-h-screen bg-background">
      <header class="border-b bg-card text-card-foreground">
        <div class="container mx-auto flex h-14 w-full items-center gap-3 px-4">
          <div class="flex min-w-0 items-center gap-2">
            <HeadscaleLogo class="h-8 w-8 shrink-0" />
            <span class="truncate text-sm font-semibold leading-none sm:text-base">Headscale UI</span>
          </div>

          <div class="ms-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-testid="locale-select"
                  :aria-label="`${t('language')}: ${LOCALE_META[locale].nativeLabel}`"
                >
                  <Languages class="h-5 w-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-48">
                <DropdownMenuLabel>{{ t("language") }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="option in SUPPORTED_LOCALES"
                  :key="option"
                  :data-testid="`locale-option-${option}`"
                  @click="chooseLocale(option)"
                >
                  <span>{{ LOCALE_META[option].nativeLabel }}</span>
                  <Check v-if="locale === option" class="ms-auto h-4 w-4" aria-hidden="true" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-testid="theme-select"
                  :aria-label="`${t('theme')}: ${themeLabel}`"
                >
                  <SunMedium v-if="colorMode === 'light'" class="h-5 w-5" aria-hidden="true" />
                  <MoonStar v-else-if="colorMode === 'dark'" class="h-5 w-5" aria-hidden="true" />
                  <MonitorCog v-else class="h-5 w-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-44">
                <DropdownMenuLabel>{{ t("theme") }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="mode in themeModes"
                  :key="mode"
                  :data-testid="`theme-option-${mode}`"
                  @click="chooseTheme(mode)"
                >
                  <SunMedium v-if="mode === 'light'" class="h-4 w-4" aria-hidden="true" />
                  <MoonStar v-else-if="mode === 'dark'" class="h-4 w-4" aria-hidden="true" />
                  <MonitorCog v-else class="h-4 w-4" aria-hidden="true" />
                  <span>{{ themeModeLabel(mode) }}</span>
                  <Check v-if="colorMode === mode" class="ms-auto h-4 w-4" aria-hidden="true" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div class="container mx-auto flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center px-4 py-8 sm:py-10">
        <div class="w-full max-w-5xl min-w-0 text-center">
          <div class="mx-auto max-w-2xl">
            <h1 class="text-2xl font-semibold sm:text-3xl">{{ t("profileSelectorTitle") }}</h1>
            <p class="mt-2 text-sm text-muted-foreground sm:text-base">
              {{ t("profileSelectorDescription") }}
            </p>
          </div>

          <div
            v-if="lastError && !connectionDialogOpen"
            data-testid="login-error"
            role="alert"
            class="mx-auto mt-4 max-w-xl rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-start text-sm text-destructive"
          >
            {{ lastError }}
          </div>

          <div class="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="profile-picker">
            <div
              v-for="profile in profiles"
              :key="profile.id"
              class="relative min-w-0"
              :data-testid="`profile-row-${profile.name}`"
            >
              <Button
                type="button"
                variant="ghost"
                :data-testid="`profile-option-${profile.name}`"
                class="h-auto min-h-36 w-full flex-col items-center justify-center gap-3 border bg-card p-4 text-center hover:bg-accent hover:text-accent-foreground"
                :aria-busy="authenticatingProfileId === profile.id"
                :disabled="isConnecting"
                @click="enterProfile(profile)"
              >
                <span
                  class="relative flex h-16 w-16 items-center justify-center rounded-full border bg-background text-lg font-semibold transition-colors"
                  :class="authenticatingProfileId === profile.id ? 'border-primary/50 bg-primary/10 text-primary' : ''"
                >
                  <LoaderCircle
                    v-if="authenticatingProfileId === profile.id"
                    class="absolute h-14 w-14 animate-spin"
                    aria-hidden="true"
                    :data-testid="`profile-loading-${profile.name}`"
                  />
                  <span :class="authenticatingProfileId === profile.id ? 'opacity-35' : ''">
                    {{ profileAvatarLabel(profile) }}
                  </span>
                </span>
                <span class="grid w-full min-w-0 gap-1">
                  <span class="truncate text-sm font-semibold">{{ profile.name }}</span>
                  <span class="break-all text-xs text-muted-foreground">{{ profile.baseUrl }}</span>
                  <span v-if="authenticatingProfileId === profile.id" class="text-xs text-primary">
                    {{ t("checkingCredentials") }}
                  </span>
                  <span v-else class="text-xs text-muted-foreground">
                    {{ profileModeLabel(profile.mode) }} · {{ t("updatedProfile") }} {{ formatDate(profile.updatedAt) }}
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                :data-testid="`edit-profile-${profile.name}`"
                class="absolute start-2 top-2 h-8 w-8 bg-background/80"
                :aria-label="t('editProfile')"
                :disabled="isConnecting"
                @click.stop="editProfile(profile)"
              >
                <Pencil class="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                :data-testid="`delete-profile-${profile.name}`"
                class="absolute end-2 top-2 h-8 w-8 bg-background/80"
                :aria-label="t('deleteProfile')"
                :disabled="isConnecting"
                @click.stop="requestDeleteProfile(profile)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              data-testid="profile-option-new"
              class="h-auto min-h-36 flex-col items-center justify-center gap-3 border border-dashed bg-card p-4 text-center hover:bg-accent hover:text-accent-foreground"
              @click="openConnectionDialog(newProfileId)"
            >
              <span class="flex h-14 w-14 items-center justify-center rounded-full border bg-background">
                <Plus class="h-6 w-6" aria-hidden="true" />
              </span>
              <span class="grid gap-1">
                <span class="text-sm font-semibold">{{ t("addServerProfile") }}</span>
                <span class="text-xs text-muted-foreground">{{ t("newProfile") }}</span>
              </span>
            </Button>
          </div>
        </div>
      </div>

      <Dialog :open="connectionDialogOpen" @update:open="handleConnectionDialogOpen">
        <DialogContent
          class="grid max-h-[calc(100svh-0.5rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-h-[calc(100svh-4rem)] sm:max-w-2xl"
          data-testid="connection-dialog"
        >
          <DialogHeader class="px-4 pb-2 pe-10 pt-3 text-start sm:px-6 sm:pb-3 sm:pt-6">
            <DialogTitle class="truncate">
              {{ selectedProfile ? `${t("editProfile")} ${selectedProfile.name}` : t("addServerProfile") }}
            </DialogTitle>
            <DialogDescription class="text-sm leading-5">{{ t("connectSubtitle") }}</DialogDescription>
          </DialogHeader>

          <form class="flex min-h-0 flex-col" data-testid="connect-form" @submit.prevent="addProfile">
            <div class="grid min-h-0 min-w-0 gap-2 overflow-y-auto px-4 pb-2 sm:gap-4 sm:px-6 sm:pb-3 md:grid-cols-2">
              <div class="min-w-0">
                <Label for="connect-profile-name">{{ t("profileName") }}</Label>
                <Input
                  id="connect-profile-name"
                  v-model="connectionForm.profileName"
                  data-testid="connect-profile-name"
                  class="mt-1.5"
                />
              </div>

              <div class="min-w-0 [&_[data-slot=native-select-wrapper]]:w-full">
                <Label for="connect-mode">{{ t("mode") }}</Label>
                <NativeSelect id="connect-mode" v-model="connectionForm.mode" data-testid="connect-mode" class="mt-1.5">
                  <NativeSelectOption value="mock">{{ t("mockMode") }}</NativeSelectOption>
                  <NativeSelectOption value="real">{{ t("realMode") }}</NativeSelectOption>
                </NativeSelect>
              </div>

              <div class="min-w-0 md:col-span-2">
                <Label for="connect-server-url">{{ t("serverUrl") }}</Label>
                <Input
                  id="connect-server-url"
                  v-model="connectionForm.baseUrl"
                  data-testid="connect-server-url"
                  class="mt-1.5"
                />
              </div>

              <div class="min-w-0 md:col-span-2">
                <Label for="connect-api-key">{{ t("apiKey") }}</Label>
                <Input
                  id="connect-api-key"
                  v-model="connectionForm.apiKey"
                  data-testid="connect-api-key"
                  type="password"
                  class="mt-1.5"
                  :placeholder="t('apiKeyPlaceholder')"
                />
              </div>

              <div class="flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm md:col-span-2">
                <Checkbox id="connect-remember" v-model="connectionForm.remember" data-testid="connect-remember" />
                <Label for="connect-remember">{{ t("rememberConnection") }}</Label>
              </div>

              <details class="group min-w-0 rounded-md border bg-muted/35 p-3 text-sm md:col-span-2" data-testid="api-key-guide">
                <summary class="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
                  <KeyRound class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div class="min-w-0">
                    <h3 class="font-medium">{{ t("apiKeyGuideTitle") }}</h3>
                    <p class="mt-1 text-muted-foreground">{{ t("apiKeyGuideDescription") }}</p>
                  </div>
                </summary>
                <div class="mt-3 rounded-md border bg-background p-3">
                  <p class="text-xs font-medium text-muted-foreground">{{ t("apiKeyGuideCommandLabel") }}</p>
                  <code class="mt-2 block break-all font-mono text-xs text-foreground">{{ apiKeyCommand }}</code>
                </div>
                <ol class="mt-3 grid gap-1 ps-5 text-xs text-muted-foreground">
                  <li>{{ t("apiKeyGuideStepServer") }}</li>
                  <li>{{ t("apiKeyGuideStepCreate") }}</li>
                  <li>{{ t("apiKeyGuideStepCopy") }}</li>
                  <li>{{ t("apiKeyGuideStepPaste") }}</li>
                </ol>
                <p class="mt-3 text-xs text-muted-foreground">{{ t("apiKeyGuideHint") }}</p>
                <a
                  :href="headscaleRemoteCliDocsUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="mt-3 inline-flex cursor-pointer text-xs font-medium text-primary underline-offset-4 hover:underline"
                  data-testid="api-key-docs-link"
                >
                  {{ t("headscaleDocs") }}
                </a>
              </details>
            </div>

            <div class="grid shrink-0 gap-2 border-t bg-background p-3 sm:gap-3 sm:px-6 sm:py-4 md:grid-cols-2" data-testid="connect-footer">
              <p
                v-if="lastError"
                data-testid="connect-error"
                role="alert"
                class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2"
              >
                {{ lastError }}
              </p>

              <DialogFooter class="md:col-span-2">
                <Button type="submit" data-testid="connect-submit" :disabled="isConnecting">
                  <LoaderCircle v-if="isConnecting" class="h-4 w-4 animate-spin" aria-hidden="true" />
                  <Plus v-else class="h-4 w-4" aria-hidden="true" />
                  {{ isConnecting ? t("addingProfile") : t("addProfile") }}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog v-model:open="profileValidationDialogOpen">
        <AlertDialogContent data-testid="profile-validation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t("continueAddProfileTitle") }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ t("continueAddProfileDescription") }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p
            v-if="profileValidationError"
            data-testid="profile-validation-error"
            class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {{ profileValidationError }}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="review-profile-connection" @click="reviewProfileConnection">
              {{ t("reviewProfileConnection") }}
            </AlertDialogCancel>
            <AlertDialogAction data-testid="continue-add-profile" @click="continueAddingProfile">
              {{ t("continueAddProfile") }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog :open="Boolean(pendingDeleteProfile)" @update:open="handleDeleteProfileDialogOpen">
        <AlertDialogContent data-testid="delete-profile-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t("confirmDeleteProfileTitle") }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ t("confirmDeleteProfileDescription") }}
              <span v-if="pendingDeleteProfile" class="mt-2 block break-all font-medium text-foreground">
                {{ pendingDeleteProfile.name }} · {{ pendingDeleteProfile.baseUrl }}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-profile">{{ t("cancel") }}</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-profile" @click="confirmDeleteProfile">
              {{ t("deleteProfile") }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>

    <div v-else class="min-h-screen bg-background text-foreground">
      <header
        class="sticky top-0 z-20 bg-card/95 shadow-sm backdrop-blur"
        data-testid="app-header"
      >
        <div class="container mx-auto flex w-full min-w-0 flex-col gap-0 px-3 pt-2 md:px-4">
          <div class="flex min-h-11 min-w-0 items-center justify-between gap-2" data-testid="header-primary-row">
            <div class="flex shrink-0 items-center gap-2" data-testid="app-logo">
              <HeadscaleLogo class="h-8 w-8" />
              <span class="text-sm font-semibold leading-none sm:text-base">Headscale UI</span>
            </div>

            <div class="ms-auto flex shrink-0 items-center gap-1">
              <DropdownMenu v-model:open="profileMenuOpen">
                <DropdownMenuTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="profile-menu-trigger"
                    class="relative"
                    :aria-label="t('profile')"
                  >
                    <CircleUserRound class="h-5 w-5" aria-hidden="true" />
                    <span
                      class="absolute -bottom-0.5 -end-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border"
                      :class="serverSignalClass"
                      :aria-label="serverSignalLabel"
                      :title="serverSignalLabel"
                      data-testid="header-server-signal"
                    >
                      <component :is="serverSignalIcon" class="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-64" data-testid="profile-menu">
                  <DropdownMenuLabel class="flex items-center gap-2">
                    <CircleUserRound class="h-4 w-4" aria-hidden="true" />
                    <span class="min-w-0 truncate">{{ currentProfileLabel }}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub
                    :open="profileSubmenu === 'language'"
                    @update:open="(isOpen) => keepProfileSubmenuOpen('language', isOpen)"
                  >
                    <DropdownMenuSubTrigger
                      data-testid="language-menu-trigger"
                      @click.prevent="openProfileSubmenu('language')"
                      @focus="openProfileSubmenu('language')"
                      @pointermove="openProfileSubmenu('language')"
                    >
                      <Languages class="h-4 w-4" aria-hidden="true" />
                      <span>{{ t("language") }}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent class="w-48" :side-offset="-16">
                      <DropdownMenuItem
                        v-for="option in SUPPORTED_LOCALES"
                        :key="option"
                        :data-testid="`locale-option-${option}`"
                        @click="chooseLocale(option)"
                      >
                        <span>{{ LOCALE_META[option].nativeLabel }}</span>
                        <Check v-if="locale === option" class="ms-auto h-4 w-4" aria-hidden="true" />
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub
                    :open="profileSubmenu === 'theme'"
                    @update:open="(isOpen) => keepProfileSubmenuOpen('theme', isOpen)"
                  >
                    <DropdownMenuSubTrigger
                      data-testid="theme-menu-trigger"
                      @click.prevent="openProfileSubmenu('theme')"
                      @focus="openProfileSubmenu('theme')"
                      @pointermove="openProfileSubmenu('theme')"
                    >
                      <SunMedium v-if="colorMode === 'light'" class="h-4 w-4" aria-hidden="true" />
                      <MoonStar v-else-if="colorMode === 'dark'" class="h-4 w-4" aria-hidden="true" />
                      <MonitorCog v-else class="h-4 w-4" aria-hidden="true" />
                      <span>{{ t("theme") }}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent class="w-44" :side-offset="-16">
                      <DropdownMenuItem
                        v-for="mode in themeModes"
                        :key="mode"
                        :data-testid="`theme-option-${mode}`"
                        @click="chooseTheme(mode)"
                      >
                        <SunMedium v-if="mode === 'light'" class="h-4 w-4" aria-hidden="true" />
                        <MoonStar v-else-if="mode === 'dark'" class="h-4 w-4" aria-hidden="true" />
                        <MonitorCog v-else class="h-4 w-4" aria-hidden="true" />
                        <span>{{ themeModeLabel(mode) }}</span>
                        <Check v-if="colorMode === mode" class="ms-auto h-4 w-4" aria-hidden="true" />
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-testid="open-server-settings" @click="openServerSettings">
                    <ShieldCheck class="h-4 w-4" aria-hidden="true" />
                    {{ copy.openServerSettings }}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" data-testid="logout" @click="logoutFromMenu">
                    <LogOut class="h-4 w-4" aria-hidden="true" />
                    {{ t("logout") }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Tabs
            :model-value="activeSection"
            :dir="meta.dir"
            class="w-full min-w-0 gap-0"
            data-testid="header-navigation"
            @update:model-value="changeSection"
          >
            <TabsList class="h-9 w-full max-w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent px-0 py-0 text-foreground">
              <TabsTrigger
                v-for="section in productSections"
                :key="section"
                :value="section"
                :data-testid="`section-${section}`"
                :aria-current="activeSection === section ? 'page' : undefined"
                class="h-9 flex-none rounded-none border-0 bg-transparent px-3 shadow-none hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
                :class="activeSection === section ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'"
              >
                <component :is="sectionIcons[section]" class="h-4 w-4" aria-hidden="true" />
                {{ copy.nav[section] }}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <section class="container mx-auto min-w-0 space-y-3 px-3 pb-6 pt-4 sm:px-4 sm:py-4 lg:px-5" data-testid="page-body">
        <div v-if="lastError" role="alert" class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ lastError }}
        </div>

        <CreateAuthKeyDialog
          :open="inviteDialogOpen"
          :users="authKeyDialogUsers"
          :defaults="authKeyDialogDefaults"
          :labels="authKeyDialogLabels"
          :is-submitting="isCreatingInvite"
          @update:open="handleInviteDialogOpen"
          @submit="createInvite"
        />

        <Dialog :open="serverSettingsDialogOpen" @update:open="handleServerSettingsOpen">
          <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-4xl" data-testid="server-settings-dialog">
            <DialogHeader>
              <DialogTitle>{{ copy.serverSettingsTitle }}</DialogTitle>
              <DialogDescription>{{ copy.serverSettingsDescription }}</DialogDescription>
            </DialogHeader>

            <Tabs
              :model-value="serverSettingsTab"
              :dir="meta.dir"
              class="grid gap-4"
              @update:model-value="changeServerSettingsTab"
            >
              <TabsList class="w-full justify-start overflow-x-auto">
                <TabsTrigger value="apiKeys" data-testid="server-tab-api-keys">
                  <KeyRound class="h-4 w-4" aria-hidden="true" />
                  {{ copy.apiKeysTitle }}
                </TabsTrigger>
                <TabsTrigger value="maintenance" data-testid="server-tab-maintenance">
                  <Server class="h-4 w-4" aria-hidden="true" />
                  {{ copy.maintenance }}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="apiKeys" class="grid gap-4" data-testid="api-key-settings">
                <div class="grid gap-2">
                  <h3 class="text-sm font-semibold">{{ copy.apiKeysTitle }}</h3>
                  <p class="text-sm text-muted-foreground">{{ copy.apiKeysDescription }}</p>
                </div>
                <div class="grid gap-3 rounded-md border bg-background p-3">
                  <div class="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div class="grid gap-2">
                      <Label for="api-key-expiration">{{ copy.apiKeyExpiration }}</Label>
                      <DateTimePicker
                        id="api-key-expiration"
                        v-model="apiKeyForm.expiration"
                        :locale="locale"
                        :time-label="copy.time"
                        :hour-label="copy.hour"
                        :minute-label="copy.minute"
                        data-testid="api-key-expiration"
                      />
                    </div>
                    <Button type="button" data-testid="create-api-key-confirm" @click="createServerApiKey">
                      <Plus class="h-4 w-4" aria-hidden="true" />
                      {{ copy.createApiKeyTitle }}
                    </Button>
                  </div>
                  <div v-if="createdApiKey" class="grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300" data-testid="created-api-key">
                    <p class="text-sm font-semibold">{{ copy.createdApiKey }}</p>
                    <code class="break-all rounded bg-background/70 px-2 py-1 text-xs text-foreground">{{ createdApiKey }}</code>
                    <p class="text-xs">{{ copy.apiKeyOnlyShownOnce }}</p>
                    <Button type="button" variant="outline" size="sm" class="w-fit" data-testid="copy-created-api-key" @click="copyInviteKey(createdApiKey)">
                      <Copy class="h-4 w-4" aria-hidden="true" />
                      {{ copiedKey === createdApiKey ? copy.copied : copy.copy }}
                    </Button>
                  </div>
                </div>
                <Card class="overflow-x-auto" data-testid="api-key-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{{ copy.apiKeyPrefix }}</TableHead>
                        <TableHead>{{ copy.joined }}</TableHead>
                        <TableHead>{{ copy.expires }}</TableHead>
                        <TableHead>{{ copy.lastSeen }}</TableHead>
                        <TableHead>{{ copy.actions }}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow v-for="key in snapshot.apiKeys" :key="key.id" :data-testid="`api-key-row-${key.prefix}`">
                        <TableCell class="font-mono text-xs">{{ key.prefix }}</TableCell>
                        <TableCell class="text-sm text-muted-foreground">{{ formatDate(key.createdAt) }}</TableCell>
                        <TableCell class="text-sm text-muted-foreground">{{ formatDate(key.expiration) }}</TableCell>
                        <TableCell class="text-sm text-muted-foreground">{{ formatDate(key.lastSeen) }}</TableCell>
                        <TableCell>
                          <div class="flex justify-start gap-2">
                            <Button type="button" size="sm" variant="outline" :data-testid="`expire-api-key-${key.prefix}`" @click="requestApiKeyAction('expire', key)">
                              {{ copy.expireApiKeyTitle }}
                            </Button>
                            <Button type="button" size="sm" variant="destructive" :data-testid="`delete-api-key-${key.prefix}`" @click="requestApiKeyAction('delete', key)">
                              {{ copy.deleteApiKeyTitle }}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="maintenance" class="grid gap-4" data-testid="server-maintenance-settings">
                <div class="grid gap-2">
                  <h3 class="text-sm font-semibold">{{ copy.maintenance }}</h3>
                  <p class="text-sm text-muted-foreground">{{ copy.maintenanceDescription }}</p>
                </div>
                <Card class="grid gap-3 p-4">
                  <div>
                    <h4 class="text-sm font-semibold">{{ copy.backfillNodeIps }}</h4>
                    <p class="mt-1 text-sm text-muted-foreground">{{ copy.backfillNodeIpsDescription }}</p>
                  </div>
                  <Button type="button" variant="outline" class="w-fit" data-testid="open-backfill-node-ips" @click="openBackfillNodeIpsDialog">
                    <Server class="h-4 w-4" aria-hidden="true" />
                    {{ copy.backfillNodeIps }}
                  </Button>
                  <p v-if="backfillNodeIpsResult" class="rounded-md bg-muted px-3 py-2 text-sm" data-testid="backfill-node-ips-result">
                    {{ copy.backfillResult }}: {{ backfillNodeIpsResult }}
                  </p>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <AlertDialog :open="Boolean(pendingApiKeyAction)" @update:open="handleApiKeyActionDialogOpen">
          <AlertDialogContent v-if="pendingApiKeyAction" :data-testid="pendingApiKeyAction.kind === 'expire' ? 'expire-api-key-dialog' : 'delete-api-key-dialog'">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {{ pendingApiKeyAction.kind === "expire" ? copy.expireApiKeyTitle : copy.deleteApiKeyTitle }}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {{ copy.apiKeysDescription }}
                <span class="mt-2 block font-mono text-xs text-foreground">{{ pendingApiKeyAction.key.prefix }}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="cancel-api-key-action">{{ copy.cancel }}</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                data-testid="confirm-api-key-action"
                @click="confirmApiKeyAction"
              >
                {{ pendingApiKeyAction.kind === "expire" ? copy.confirmExpireApiKey : copy.confirmDeleteApiKey }}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog :open="backfillNodeIpsDialogOpen" @update:open="handleBackfillNodeIpsDialogOpen">
          <AlertDialogContent data-testid="backfill-node-ips-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{{ copy.backfillNodeIps }}</AlertDialogTitle>
              <AlertDialogDescription>{{ copy.backfillNodeIpsDescription }}</AlertDialogDescription>
            </AlertDialogHeader>
            <label class="flex items-start gap-2 rounded-md border bg-background p-3 text-sm" for="backfill-node-ips-confirmed">
              <Checkbox id="backfill-node-ips-confirmed" v-model="backfillNodeIpsConfirmed" data-testid="backfill-node-ips-confirmed" />
              <span>{{ copy.maintenanceDescription }}</span>
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="cancel-backfill-node-ips">{{ copy.cancel }}</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                data-testid="confirm-backfill-node-ips"
                :disabled="!backfillNodeIpsConfirmed"
                @click="confirmBackfillNodeIps"
              >
                {{ copy.confirmBackfillNodeIps }}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog :open="Boolean(selectedDetailNode)" @update:open="handleNodeDetailsOpen">
          <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-3xl" data-testid="device-detail-dialog">
            <template v-if="selectedDetailNode">
              <DialogHeader>
                <DialogTitle class="flex min-w-0 items-center gap-2">
                  <Network class="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span class="truncate">{{ selectedDetailNode.name }}</span>
                </DialogTitle>
                <DialogDescription>{{ copy.machineDetails }}</DialogDescription>
              </DialogHeader>

              <div class="grid gap-4">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" :class="nodeStatusClass(selectedDetailNode)" :data-testid="`device-detail-status-${selectedDetailNode.id}`">
                    <Wifi v-if="selectedDetailNode.online" class="h-3 w-3" aria-hidden="true" />
                    <WifiOff v-else class="h-3 w-3" aria-hidden="true" />
                    {{ nodeStatusLabel(selectedDetailNode) }}
                  </Badge>
                  <Badge variant="outline">{{ copy.nodeId }}: {{ selectedDetailNode.id }}</Badge>
                  <Badge v-if="selectedDetailNode.registerMethod" variant="outline">
                    {{ selectedDetailNode.registerMethod }}
                  </Badge>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <section class="grid gap-2 rounded-md border bg-background p-3">
                    <h3 class="text-sm font-semibold">{{ copy.owner }}</h3>
                    <button
                      v-if="hasVisibleUser(selectedDetailNode.user)"
                      type="button"
                      class="w-fit text-start text-sm font-medium text-primary underline underline-offset-4"
                      :data-testid="`device-detail-owner-${selectedDetailNode.id}`"
                      @click="openUserDetails(selectedDetailNode.user)"
                    >
                      {{ nodeOwner(selectedDetailNode) }}
                    </button>
                    <span v-else class="text-sm text-muted-foreground">-</span>
                  </section>

                  <section class="grid gap-2 rounded-md border bg-background p-3">
                    <h3 class="text-sm font-semibold">{{ copy.details }}</h3>
                    <p class="text-sm text-muted-foreground">{{ copy.lastSeen }}: {{ formatDate(selectedDetailNode.lastSeen) }}</p>
                    <p class="text-sm text-muted-foreground">{{ copy.expires }}: {{ formatDate(selectedDetailNode.expiry) }}</p>
                  </section>
                </div>

                <section class="grid gap-2">
                  <h3 class="text-sm font-semibold">{{ copy.addresses }}</h3>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="(address, addressIndex) in selectedDetailNode.ipAddresses"
                      :key="address"
                      variant="outline"
                      class="border-slate-200 bg-muted/60 font-mono text-[11px] text-muted-foreground dark:border-slate-800"
                      :data-testid="`device-detail-ip-${selectedDetailNode.id}-${addressIndex}`"
                    >
                      {{ address }}
                    </Badge>
                  </div>
                </section>

                <section v-if="selectedDetailNode.tags.length" class="grid gap-2">
                  <h3 class="text-sm font-semibold">{{ copy.tags }}</h3>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="tag in selectedDetailNode.tags"
                      :key="tag"
                      variant="outline"
                      :class="deviceTagClass(tag)"
                    >
                      {{ tag }}
                    </Badge>
                  </div>
                </section>

                <section class="grid gap-2">
                  <h3 class="text-sm font-semibold">{{ copy.routes }}</h3>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="route in nodePendingRoutes(selectedDetailNode)"
                      :key="route"
                      variant="outline"
                      :class="pendingRouteClass(route)"
                    >
                      {{ route }}
                    </Badge>
                    <Badge
                      v-for="route in selectedDetailNode.approvedRoutes"
                      :key="route"
                      variant="outline"
                      :class="approvedRouteClass()"
                    >
                      {{ route }}
                    </Badge>
                    <span
                      v-if="nodePendingRoutes(selectedDetailNode).length === 0 && selectedDetailNode.approvedRoutes.length === 0"
                      class="text-sm text-muted-foreground"
                    >
                      {{ copy.noRouteValues }}
                    </span>
                  </div>
                </section>
              </div>

              <DialogFooter class="flex-col gap-2 sm:flex-row sm:justify-between">
                <div class="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" data-testid="device-detail-view-routes" @click="jumpToRoutesFromDetails(selectedDetailNode)">
                    <Router class="h-4 w-4" aria-hidden="true" />
                    {{ copy.viewRoutes }}
                  </Button>
                  <Button type="button" variant="outline" size="sm" data-testid="device-detail-rename" @click="openRenameDialogFromDetails(selectedDetailNode)">
                    <Pencil class="h-4 w-4" aria-hidden="true" />
                    {{ copy.rename }}
                  </Button>
                  <Button type="button" variant="outline" size="sm" data-testid="device-detail-edit-tags" @click="openTagsDialog(selectedDetailNode)">
                    <ShieldCheck class="h-4 w-4" aria-hidden="true" />
                    {{ copy.editTags }}
                  </Button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" data-testid="device-detail-expire" @click="openExpireDialogFromDetails(selectedDetailNode)">
                    <Clock class="h-4 w-4" aria-hidden="true" />
                    {{ copy.expire }}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" data-testid="device-detail-remove" @click="openRemoveDialogFromDetails(selectedDetailNode)">
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                    {{ copy.remove }}
                  </Button>
                </div>
              </DialogFooter>
            </template>
          </DialogContent>
        </Dialog>

        <Dialog :open="Boolean(selectedDetailUser)" @update:open="handleUserDetailsOpen">
          <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-3xl" data-testid="user-detail-dialog">
            <template v-if="selectedDetailUser">
              <DialogHeader>
                <DialogTitle class="flex min-w-0 items-center gap-2">
                  <CircleUserRound class="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span class="truncate">{{ userLabel(selectedDetailUser) }}</span>
                </DialogTitle>
                <DialogDescription>{{ copy.userDetails }}</DialogDescription>
              </DialogHeader>

              <div class="grid gap-4">
                <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div class="rounded-md border bg-background p-3">
                    <p class="text-xs text-muted-foreground">{{ copy.userId }}</p>
                    <p class="mt-1 text-sm font-medium">{{ selectedDetailUser.id }}</p>
                  </div>
                  <div class="rounded-md border bg-background p-3">
                    <p class="text-xs text-muted-foreground">{{ copy.role }}</p>
                    <p class="mt-1 text-sm font-medium">{{ userRole(selectedDetailUser) }}</p>
                  </div>
                  <div class="rounded-md border bg-background p-3">
                    <p class="text-xs text-muted-foreground">{{ copy.deviceCount }}</p>
                    <p class="mt-1 text-sm font-medium">{{ selectedUserDevices.length }}</p>
                  </div>
                  <div class="rounded-md border bg-background p-3">
                    <p class="text-xs text-muted-foreground">{{ copy.pendingRoutes }}</p>
                    <p class="mt-1 text-sm font-medium">{{ selectedUserPendingRoutesCount }}</p>
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <section class="grid gap-2 rounded-md border bg-background p-3">
                    <h3 class="text-sm font-semibold">{{ copy.details }}</h3>
                    <p class="break-all text-sm text-muted-foreground">{{ copy.email }}: {{ selectedDetailUser.email || copy.unknown }}</p>
                    <p class="text-sm text-muted-foreground">{{ copy.authSource }}: {{ userAuthSource(selectedDetailUser) }}</p>
                    <p class="text-sm text-muted-foreground">{{ copy.joined }}: {{ formatDate(selectedDetailUser.createdAt) }}</p>
                  </section>

                  <section class="grid gap-2 rounded-md border bg-background p-3">
                    <h3 class="text-sm font-semibold">{{ copy.activeAuthKeys }}</h3>
                    <div v-if="selectedUserActiveKeys.length" class="grid gap-1">
                      <code
                        v-for="key in selectedUserActiveKeys"
                        :key="key.id"
                        class="w-fit rounded bg-secondary px-1.5 py-0.5 text-xs"
                      >
                        {{ shortSecret(key.key) }}
                      </code>
                    </div>
                    <p v-else class="text-sm text-muted-foreground">{{ copy.noAuthKeys }}</p>
                  </section>
                </div>

                <section class="grid gap-2">
                  <h3 class="text-sm font-semibold">{{ copy.personalDevices }}</h3>
                  <div v-if="selectedUserDevices.length" class="grid gap-2">
                    <button
                      v-for="node in selectedUserDevices"
                      :key="node.id"
                      type="button"
                      class="grid gap-2 rounded-md border bg-background p-3 text-start hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      :data-testid="`user-detail-device-${node.id}`"
                      @click="openNodeDetails(node)"
                    >
                      <span class="flex flex-wrap items-center gap-2">
                        <span class="font-medium">{{ node.name }}</span>
                        <Badge variant="outline" :class="nodeStatusClass(node)">{{ nodeStatusLabel(node) }}</Badge>
                      </span>
                      <span class="flex flex-wrap gap-1">
                        <Badge
                          v-for="address in node.ipAddresses"
                          :key="address"
                          variant="outline"
                          class="border-slate-200 bg-muted/60 font-mono text-[11px] text-muted-foreground dark:border-slate-800"
                        >
                          {{ address }}
                        </Badge>
                      </span>
                    </button>
                  </div>
                  <p v-else class="text-sm text-muted-foreground">{{ copy.noPersonalDevices }}</p>
                </section>

                <section class="grid gap-2">
                  <h3 class="text-sm font-semibold">{{ copy.policyReferences }}</h3>
                  <div v-if="selectedUserPolicyReferences.length" class="flex flex-wrap gap-1">
                    <Badge v-for="reference in selectedUserPolicyReferences" :key="reference" variant="outline">
                      {{ reference }}
                    </Badge>
                  </div>
                  <p v-else class="text-sm text-muted-foreground">{{ copy.noPolicyReferences }}</p>
                </section>
              </div>

              <DialogFooter class="gap-2">
                <Button type="button" variant="outline" data-testid="user-detail-view-machines" @click="jumpToMachinesForUser(selectedDetailUser)">
                  <Network class="h-4 w-4" aria-hidden="true" />
                  {{ copy.viewMachines }}
                </Button>
                <Button type="button" data-testid="user-detail-create-auth-key" @click="openInviteDialogForUser(selectedDetailUser)">
                  <KeyRound class="h-4 w-4" aria-hidden="true" />
                  {{ copy.createInvite }}
                </Button>
              </DialogFooter>
            </template>
          </DialogContent>
        </Dialog>

        <Dialog :open="Boolean(selectedRenameUser)" @update:open="handleRenameMemberDialogOpen">
          <DialogContent v-if="selectedRenameUser" data-testid="rename-member-dialog">
            <DialogHeader>
              <DialogTitle>{{ copy.renameMemberTitle }}</DialogTitle>
              <DialogDescription>{{ copy.renameMemberDescription }}</DialogDescription>
            </DialogHeader>
            <div class="grid gap-2">
              <Label for="rename-member-name">{{ copy.memberName }}</Label>
              <Input
                id="rename-member-name"
                v-model="renameMemberForm.name"
                data-testid="rename-member-name"
                @keydown.enter.prevent="confirmRenameMember"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" data-testid="rename-member-cancel" @click="handleRenameMemberDialogOpen(false)">
                {{ copy.cancel }}
              </Button>
              <Button type="button" data-testid="confirm-rename-member" @click="confirmRenameMember">
                {{ copy.saveMemberName }}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog :open="Boolean(pendingDeleteUser)" @update:open="handleDeleteMemberDialogOpen">
          <AlertDialogContent v-if="pendingDeleteUser" data-testid="delete-member-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{{ copy.deleteMemberTitle }}</AlertDialogTitle>
              <AlertDialogDescription>
                {{ copy.deleteMemberDescription }}
                <span class="mt-2 block font-medium text-foreground">{{ userLabel(pendingDeleteUser) }}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="cancel-delete-member">{{ copy.cancel }}</AlertDialogCancel>
              <Button type="button" variant="destructive" data-testid="confirm-delete-member" @click="confirmDeleteMember">
                {{ copy.confirmDeleteMember }}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog :open="Boolean(pendingInviteAction)" @update:open="handleInviteActionDialogOpen">
          <AlertDialogContent v-if="pendingInviteAction" :data-testid="pendingInviteAction.kind === 'expire' ? 'expire-invite-dialog' : 'delete-invite-dialog'">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {{ pendingInviteAction.kind === "expire" ? copy.expireInviteTitle : copy.deleteInviteTitle }}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {{ pendingInviteAction.kind === "expire" ? copy.expireInviteDescription : copy.deleteInviteDescription }}
                <span class="mt-2 block font-mono text-xs text-foreground">{{ shortSecret(pendingInviteAction.key.key) }}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="cancel-invite-action">{{ copy.cancel }}</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                data-testid="confirm-invite-action"
                @click="confirmInviteAction"
              >
                {{ pendingInviteAction.kind === "expire" ? copy.confirmExpireInvite : copy.confirmDeleteInvite }}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog :open="renameDialogOpen" @update:open="handleRenameDialogOpen">
          <DialogContent v-if="selectedRenameNode" data-testid="rename-node-dialog">
            <DialogHeader>
              <DialogTitle>{{ copy.renameMachineTitle }}</DialogTitle>
              <DialogDescription>
                {{ copy.renameMachineDescription }}
              </DialogDescription>
            </DialogHeader>
            <div class="grid gap-2">
              <Label for="rename-node-dialog-input">{{ copy.machineName }}</Label>
              <Input
                id="rename-node-dialog-input"
                v-model="renameDrafts[selectedRenameNode.id]"
                data-testid="rename-node-dialog-input"
                @keydown.enter.prevent="confirmRenameNode"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" data-testid="rename-node-cancel" @click="handleRenameDialogOpen(false)">
                {{ copy.cancel }}
              </Button>
              <Button data-testid="rename-node-confirm" @click="confirmRenameNode">
                {{ copy.saveName }}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog :open="Boolean(selectedTagsNode)" @update:open="handleTagsDialogOpen">
          <DialogContent v-if="selectedTagsNode" data-testid="node-tags-dialog">
            <DialogHeader>
              <DialogTitle>{{ copy.editNodeTagsTitle }}</DialogTitle>
              <DialogDescription>
                {{ copy.editNodeTagsDescription }}
              </DialogDescription>
            </DialogHeader>
            <div class="grid gap-2">
              <Label for="node-tags-input">{{ copy.nodeTags }}</Label>
              <Input
                id="node-tags-input"
                v-model="tagsForm.tags"
                data-testid="node-tags-input"
                placeholder="tag:server, tag:router"
              />
              <p class="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                {{ copy.replaceTagsWarning }}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" data-testid="node-tags-cancel" @click="handleTagsDialogOpen(false)">
                {{ copy.cancel }}
              </Button>
              <Button type="button" data-testid="node-tags-confirm" @click="confirmSetNodeTags">
                {{ copy.saveTags }}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog :open="expireDialogOpen" @update:open="handleExpireDialogOpen">
          <AlertDialogContent v-if="selectedExpireNode" data-testid="expire-node-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{{ copy.expireMachineTitle }}</AlertDialogTitle>
              <AlertDialogDescription>
                {{ copy.expireMachineDescription }}
                <span class="mt-2 block font-medium text-foreground">{{ selectedExpireNode.name }}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="expire-node-cancel">{{ copy.cancel }}</AlertDialogCancel>
              <Button variant="destructive" data-testid="expire-node-confirm" @click="confirmExpireNode">
                {{ copy.confirmExpire }}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog :open="removeDialogOpen" @update:open="handleRemoveDialogOpen">
          <AlertDialogContent v-if="selectedRemoveNode" data-testid="remove-node-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{{ copy.removeMachineTitle }}</AlertDialogTitle>
              <AlertDialogDescription>
                {{ copy.removeMachineDescription }}
                <span class="mt-2 block font-medium text-foreground">{{ selectedRemoveNode.name }}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="remove-node-cancel">{{ copy.cancel }}</AlertDialogCancel>
              <Button variant="destructive" data-testid="remove-node-confirm" @click="confirmRemoveNode">
                {{ copy.confirmRemove }}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <section v-if="activeSection === 'home'" class="space-y-3 lg:space-y-4">
          <div class="grid gap-3 lg:flex lg:items-end lg:justify-between">
            <div>
              <h1 class="text-2xl font-semibold">{{ copy.dashboardTitle }}</h1>
              <p class="mt-1 text-sm text-muted-foreground">{{ copy.dashboardSubtitle }}</p>
            </div>
            <Button variant="outline" data-testid="refresh-data" class="w-full sm:w-fit" @click="refreshSnapshot">
              <Activity class="h-4 w-4" aria-hidden="true" />
              {{ copy.refreshData }}
            </Button>
          </div>

          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Card class="p-3">
              <p class="text-sm text-muted-foreground">{{ copy.onlineDevices }}</p>
              <p class="mt-1 text-2xl font-semibold">{{ onlineNodes.length }}</p>
            </Card>
            <Card class="p-3">
              <p class="text-sm text-muted-foreground">{{ copy.totalDevices }}</p>
              <p class="mt-1 text-2xl font-semibold">{{ snapshot.nodes.length }}</p>
            </Card>
            <Card class="p-3">
              <p class="text-sm text-muted-foreground">{{ copy.nav.members }}</p>
              <p class="mt-1 text-2xl font-semibold">{{ visibleUsers.length }}</p>
            </Card>
            <Card class="p-3">
              <p class="text-sm text-muted-foreground">{{ copy.openInvites }}</p>
              <p class="mt-1 text-2xl font-semibold">{{ openInvites.length }}</p>
            </Card>
            <Card class="p-3">
              <p class="text-sm text-muted-foreground">{{ copy.advertisedRoutes }}</p>
              <p class="mt-1 text-2xl font-semibold">{{ routesWaiting }}</p>
            </Card>
          </div>

          <div>
            <h2 class="mb-3 font-semibold">{{ copy.recentDevices }}</h2>
            <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <Card v-for="node in snapshot.nodes.slice(0, 4)" :key="node.id" class="p-3">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-medium">{{ node.name }}</p>
                    <p v-if="hasVisibleUser(node.user)" class="text-sm text-muted-foreground">
                      {{ nodeOwner(node) }}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    :class="nodeStatusClass(node)"
                    :data-testid="`recent-device-status-${node.id}`"
                  >
                    <Wifi v-if="node.online" class="h-3 w-3" aria-hidden="true" />
                    <WifiOff v-else class="h-3 w-3" aria-hidden="true" />
                    {{ nodeStatusLabel(node) }}
                  </Badge>
                </div>
                <div class="mt-3 flex flex-wrap gap-1">
                  <Badge
                    v-for="(address, addressIndex) in node.ipAddresses"
                    :key="address"
                    variant="outline"
                    class="border-slate-200 bg-muted/60 font-mono text-[11px] text-muted-foreground dark:border-slate-800"
                    :data-testid="`device-ip-${node.id}-${addressIndex}`"
                  >
                    {{ address }}
                  </Badge>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'devices'" class="space-y-3 sm:space-y-4">
          <Dialog :open="deviceSetupDialogOpen" @update:open="handleDeviceSetupDialogOpen">
            <DialogContent class="max-h-[min(90vh,760px)] overflow-y-auto sm:max-w-4xl" data-testid="add-device-dialog">
              <div class="grid gap-4" data-testid="add-device-wizard">
                <DialogHeader>
                  <DialogTitle>{{ deviceSetupTask ? deviceSetupTitle : copy.addDevice }}</DialogTitle>
                  <DialogDescription>
                    <span class="block">{{ copy.deviceSetupLead }}</span>
                    <span v-if="deviceSetupTask" class="mt-1 block">{{ deviceSetupDescription }}</span>
                  </DialogDescription>
                </DialogHeader>

                <div class="grid gap-4">
                  <nav
                    v-if="deviceSetupTask"
                    class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                    :aria-label="copy.addDevice"
                    data-testid="add-device-stepper"
                  >
                    <button
                      v-for="(step, index) in addDeviceSteps"
                      :key="step.id"
                      type="button"
                      class="flex min-w-0 items-start gap-2 rounded-md border bg-background px-3 py-2 text-start"
                      :class="[
                        addDeviceStep === step.id
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'text-muted-foreground',
                        isAddDeviceStepComplete(index) ? 'border-primary/40' : '',
                      ]"
                      :disabled="index > addDeviceStepIndex"
                      :aria-current="addDeviceStep === step.id ? 'step' : undefined"
                      :data-testid="`add-device-step-${step.id}`"
                      @click="goToAddDeviceStep(index)"
                    >
                      <span class="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                        <Check v-if="isAddDeviceStepComplete(index)" class="h-3 w-3" aria-hidden="true" />
                        <span v-else>{{ index + 1 }}</span>
                      </span>
                      <span class="grid min-w-0 gap-0.5">
                        <span class="truncate text-sm font-medium">{{ step.label }}</span>
                        <span class="line-clamp-2 text-xs leading-4 text-muted-foreground">{{ step.description }}</span>
                      </span>
                    </button>
                  </nav>

                  <div class="min-w-0">
                    <div v-if="addDeviceStep === 'type'" class="grid gap-3 sm:grid-cols-3" data-testid="add-device-options">
                      <Button
                        type="button"
                        variant="outline"
                        class="h-auto w-full items-start justify-start gap-3 whitespace-normal p-4 text-start"
                        data-testid="add-linux-device"
                        @click="prepareDeviceInvite('server')"
                      >
                        <Server class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span class="grid min-w-0 gap-1">
                          <span class="font-medium">{{ copy.linuxServer }}</span>
                          <span class="text-xs leading-5 text-muted-foreground">{{ copy.linuxServerDescription }}</span>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        class="h-auto w-full items-start justify-start gap-3 whitespace-normal p-4 text-start"
                        data-testid="add-client-device"
                        @click="prepareDeviceInvite('client')"
                      >
                        <Network class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span class="grid min-w-0 gap-1">
                          <span class="font-medium">{{ copy.clientDevice }}</span>
                          <span class="text-xs leading-5 text-muted-foreground">{{ copy.clientDeviceDescription }}</span>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        class="h-auto w-full items-start justify-start gap-3 whitespace-normal p-4 text-start"
                        data-testid="add-pending-node"
                        @click="preparePendingRegistration"
                      >
                        <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span class="grid min-w-0 gap-1">
                          <span class="font-medium">{{ copy.pendingRegistrationTitle }}</span>
                          <span class="text-xs leading-5 text-muted-foreground">{{ copy.pendingRegistrationDescription }}</span>
                        </span>
                      </Button>
                    </div>

                    <div
                      v-else-if="deviceSetupTask === 'pending' && addDeviceStep === 'pending'"
                      class="grid gap-4"
                      data-testid="pending-registration-flow"
                    >
                      <div class="grid gap-4 md:grid-cols-2">
                        <section class="grid gap-3 rounded-md border bg-background p-4">
                          <div>
                            <h3 class="text-sm font-semibold">{{ copy.pendingNode }}</h3>
                            <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ copy.pendingNodeDescription }}</p>
                          </div>
                          <div class="grid gap-2">
                            <Label for="pending-registration-user">{{ copy.inviteOwner }}</Label>
                            <NativeSelect id="pending-registration-user" v-model="pendingRegistrationForm.user" data-testid="pending-registration-user">
                              <NativeSelectOption v-for="user in visibleUsers" :key="user.id" :value="user.id">
                                {{ userLabel(user) }}
                              </NativeSelectOption>
                            </NativeSelect>
                          </div>
                          <div class="grid gap-2">
                            <Label for="pending-node-key">{{ copy.nodeRegistrationKey }}</Label>
                            <Input
                              id="pending-node-key"
                              v-model="pendingRegistrationForm.key"
                              data-testid="pending-node-key"
                              :placeholder="copy.nodeRegistrationKeyPlaceholder"
                            />
                          </div>
                          <Button type="button" class="w-fit" data-testid="register-pending-node" @click="registerPendingNode">
                            <ShieldCheck class="h-4 w-4" aria-hidden="true" />
                            {{ copy.registerPendingNode }}
                          </Button>
                        </section>

                        <section class="grid gap-3 rounded-md border bg-background p-4">
                          <div>
                            <h3 class="text-sm font-semibold">{{ copy.registrationRequest }}</h3>
                            <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ copy.registrationRequestDescription }}</p>
                          </div>
                          <div class="grid gap-2">
                            <Label for="auth-request-id">{{ copy.authId }}</Label>
                            <Input
                              id="auth-request-id"
                              v-model="pendingRegistrationForm.authId"
                              data-testid="auth-request-id"
                              :placeholder="copy.authIdPlaceholder"
                            />
                          </div>
                          <div class="flex flex-wrap gap-2">
                            <Button type="button" data-testid="auth-register" @click="registerAuthRequest">
                              {{ copy.registerAuthRequest }}
                            </Button>
                            <Button type="button" variant="outline" data-testid="auth-approve" @click="approveAuthRequest">
                              {{ copy.approveAuthRequest }}
                            </Button>
                            <Button type="button" variant="destructive" data-testid="auth-reject" @click="rejectAuthRequest">
                              {{ copy.rejectAuthRequest }}
                            </Button>
                          </div>
                        </section>
                      </div>
                    </div>

                    <div
                      v-else-if="deviceSetupTask === 'pending' && addDeviceStep === 'result'"
                      class="grid gap-2 rounded-md border bg-card p-4"
                      data-testid="registration-result"
                    >
                      <p v-if="lastRegisteredNode" class="text-sm font-medium">
                        {{ copy.registeredNode }}: {{ lastRegisteredNode.name }}
                      </p>
                      <p v-if="authRequestResult" class="text-sm text-muted-foreground">{{ authRequestResult }}</p>
                    </div>

                    <div v-else-if="deviceSetupTask" class="grid gap-4" data-testid="device-setup-flow">
                      <section v-if="addDeviceStep === 'preferences'" class="grid gap-3" data-testid="setup-device-step">
                        <div class="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{{ deviceSetupTask === "server" ? copy.linuxServer : copy.clientDevice }}</Badge>
                          <h2 class="text-lg font-semibold">{{ copy.setupDevice }}</h2>
                        </div>
                        <div class="grid gap-4">
                          <div class="grid gap-2">
                            <div class="flex items-start justify-between gap-4">
                              <div>
                                <h3 class="text-sm font-semibold">{{ copy.tags }}</h3>
                                <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ copy.useTagsDescription }}</p>
                              </div>
                              <Switch
                                :model-value="inviteForm.aclTags.trim().length > 0"
                                data-testid="setup-tags-enabled"
                                @update:model-value="inviteForm.aclTags = $event ? 'tag:server' : ''"
                              />
                            </div>
                            <Input id="setup-tags" v-model="inviteForm.aclTags" data-testid="setup-tags" placeholder="tag:server" />
                            <button
                              type="button"
                              class="w-fit text-xs font-medium text-primary underline underline-offset-4"
                              data-testid="setup-manage-tags"
                              @click="openAccessFromDeviceSetup"
                            >
                              {{ copy.manageTags }}
                            </button>
                          </div>
                          <div class="flex items-start justify-between gap-4">
                            <div>
                              <h3 class="text-sm font-semibold">{{ copy.ephemeral }}</h3>
                              <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ copy.ephemeralDescription }}</p>
                            </div>
                            <Switch v-model="inviteForm.ephemeral" data-testid="setup-ephemeral" />
                          </div>
                          <div class="flex items-start justify-between gap-4">
                            <div>
                              <h3 class="text-sm font-semibold">{{ copy.exitRoute }}</h3>
                              <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ copy.exitNodeDescription }}</p>
                            </div>
                            <Switch data-testid="setup-exit-node" />
                          </div>
                        </div>
                      </section>

                      <section v-else-if="addDeviceStep === 'authKey'" class="grid gap-3" data-testid="setup-auth-key-step">
                        <div class="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{{ deviceSetupTask === "server" ? copy.linuxServer : copy.clientDevice }}</Badge>
                          <h2 class="text-lg font-semibold">{{ copy.setupAuthKey }}</h2>
                        </div>
                        <div class="grid gap-4">
                          <div class="grid gap-2">
                            <div class="flex items-start justify-between gap-4">
                              <div>
                                <h3 class="text-sm font-semibold">{{ copy.reusable }}</h3>
                                <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ copy.reusableDescription }}</p>
                              </div>
                              <Switch v-model="inviteForm.reusable" data-testid="setup-reusable" />
                            </div>
                            <p class="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                              {{ copy.authKeyAutomationHint }}
                            </p>
                          </div>
                          <div class="grid gap-2">
                            <Label for="setup-expiration">{{ copy.inviteExpiration }}</Label>
                            <p class="text-xs leading-5 text-muted-foreground">{{ copy.authKeyExpirationDescription }}</p>
                            <div class="flex flex-wrap items-center gap-2">
                              <div class="inline-flex h-9 items-center overflow-hidden rounded-md border bg-background">
                                <Input
                                  id="setup-expiration"
                                  :model-value="String(authKeyExpiryDays)"
                                  data-testid="setup-expiration"
                                  inputmode="numeric"
                                  class="h-9 w-14 rounded-none border-0 text-center"
                                  @update:model-value="setAuthKeyExpiryDays(Number($event))"
                                />
                                <button
                                  type="button"
                                  class="h-9 border-s px-3 text-sm"
                                  data-testid="setup-expiration-decrement"
                                  @click="setAuthKeyExpiryDays(authKeyExpiryDays - 1)"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  class="h-9 border-s px-3 text-sm"
                                  data-testid="setup-expiration-increment"
                                  @click="setAuthKeyExpiryDays(authKeyExpiryDays + 1)"
                                >
                                  +
                                </button>
                              </div>
                              <span class="text-sm text-muted-foreground">{{ copy.days }}</span>
                            </div>
                            <p class="text-xs text-muted-foreground">{{ copy.mustBeBetweenDays }}</p>
                            <p class="rounded-md bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                              {{ copy.keyExpiryHint }}
                            </p>
                          </div>
                        </div>
                      </section>

                      <section v-else-if="addDeviceStep === 'generate'" class="grid gap-3" data-testid="setup-generate-step">
                        <div class="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{{ deviceSetupTask === "server" ? copy.linuxServer : copy.clientDevice }}</Badge>
                          <Badge v-if="inviteForm.aclTags" variant="outline">{{ inviteForm.aclTags }}</Badge>
                          <Badge v-if="inviteForm.reusable" variant="outline">{{ copy.reusable }}</Badge>
                          <Badge v-if="inviteForm.ephemeral" variant="outline">{{ copy.ephemeral }}</Badge>
                        </div>
                        <div class="grid gap-3">
                          <Button class="w-fit" data-testid="generate-install-script" @click="openInviteDialogFromDeviceSetup">
                            <KeyRound class="h-4 w-4" aria-hidden="true" />
                            {{ copy.generateInstallScript }}
                          </Button>
                          <div v-if="lastCreatedInvite" class="grid gap-3 rounded-md border bg-card p-4" data-testid="created-invite">
                            <div>
                              <p class="text-sm font-medium">{{ copy.inviteKey }}</p>
                              <code class="mt-2 block break-all rounded-md bg-secondary px-2 py-1 text-xs">{{ lastCreatedInvite }}</code>
                            </div>
                            <div>
                              <p class="text-sm font-medium">{{ copy.installCommand }}</p>
                              <code class="mt-2 block break-all rounded-md bg-secondary px-2 py-1 text-xs">{{ installCommand }}</code>
                            </div>
                            <Button size="sm" variant="outline" class="w-fit" data-testid="copy-setup-install-command" @click="copyInviteKey(installCommand)">
                              <Copy class="h-4 w-4" aria-hidden="true" />
                              {{ copiedKey === installCommand ? copy.copied : copy.copyCommand }}
                            </Button>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>

                <DialogFooter v-if="deviceSetupTask" class="gap-2 sm:justify-between">
                  <Button type="button" variant="outline" data-testid="add-device-prev" @click="goToPreviousAddDeviceStep">
                    {{ copy.previousStep }}
                  </Button>
                  <Button
                    v-if="addDeviceStep === 'generate' || addDeviceStep === 'result'"
                    type="button"
                    data-testid="add-device-finish"
                    @click="finishAddDeviceFlow"
                  >
                    {{ copy.finish }}
                  </Button>
                  <Button
                    v-else
                    type="button"
                    data-testid="add-device-next"
                    :disabled="!canMoveAddDeviceNext"
                    @click="goToNextAddDeviceStep"
                  >
                    {{ copy.nextStep }}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <div class="grid gap-3" data-testid="machines-workbench">
            <div class="grid gap-2 sm:flex sm:items-start sm:justify-between sm:gap-3">
              <div>
                <h1 class="text-xl font-semibold">{{ copy.devicesTitle }}</h1>
                <p class="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {{ copy.devicesSubtitle }}
                  <a
                    href="https://tailscale.com/kb/1017/install"
                    class="cursor-pointer font-medium text-primary underline underline-offset-4"
                    data-testid="install-docs-link"
                  >
                    {{ copy.learnMore }}
                  </a>
                </p>
              </div>
              <Button size="sm" class="w-fit" data-testid="add-device-toggle" @click="openDeviceSetupDialog">
                <Plus class="h-4 w-4" aria-hidden="true" />
                {{ copy.addDevice }}
              </Button>
            </div>

            <Card v-if="snapshot.nodes.length === 0" class="relative overflow-hidden bg-accent/35 p-5 sm:p-8" data-testid="machines-empty">
              <div class="relative z-10 max-w-md">
                <h2 class="text-lg font-semibold">{{ copy.addFirstDevice }}</h2>
                <p class="mt-2 text-sm text-muted-foreground">{{ copy.addFirstDeviceDescription }}</p>
                <Button class="mt-4" data-testid="add-first-device" @click="prepareDeviceInvite('client')">
                  <Plus class="h-4 w-4" aria-hidden="true" />
                  {{ copy.addDevice }}
                </Button>
              </div>
              <div class="pointer-events-none absolute bottom-0 end-0 hidden grid-cols-4 gap-0 p-4 sm:grid" aria-hidden="true">
                <span class="h-12 w-12 rounded-tl-full bg-primary/90" />
                <span class="h-12 w-12 rounded-full bg-primary/20" />
                <span class="h-12 w-12 rounded-br-full bg-primary/80" />
                <span class="h-12 w-12 bg-primary/10" />
                <span class="h-12 w-12 rounded-full bg-primary/80" />
                <span class="h-12 w-12 rounded-br-full bg-primary/25" />
                <span class="h-12 w-12 rounded-full bg-primary/90" />
                <span class="h-12 w-12 rounded-bl-full bg-primary/20" />
              </div>
            </Card>

            <div v-else class="min-w-0 space-y-2" data-testid="machine-table-shell">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center" data-testid="machine-toolbar">
                <div class="w-full sm:max-w-sm">
                  <Label for="device-search" class="sr-only">{{ copy.searchDevices }}</Label>
                  <div class="relative">
                    <Search class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input id="device-search" v-model="deviceSearch" data-testid="device-search" class="ps-8" :placeholder="copy.searchDevices" />
                  </div>
                </div>
                <div class="w-full sm:w-48">
                  <Label for="machine-filter" class="sr-only">{{ copy.filters }}</Label>
                  <div class="relative">
                    <Filter class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <NativeSelect id="machine-filter" v-model="machineFilter" data-testid="machine-filter" class="ps-8">
                      <NativeSelectOption value="all">{{ copy.allMachines }}</NativeSelectOption>
                      <NativeSelectOption value="online">{{ copy.onlineOnly }}</NativeSelectOption>
                      <NativeSelectOption value="offline">{{ copy.offlineOnly }}</NativeSelectOption>
                      <NativeSelectOption value="expired">{{ copy.expiredOnly }}</NativeSelectOption>
                      <NativeSelectOption value="routes">{{ copy.routeAdvertisers }}</NativeSelectOption>
                      <NativeSelectOption value="tagged">{{ copy.taggedOnly }}</NativeSelectOption>
                    </NativeSelect>
                  </div>
                </div>
                <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">{{ filteredNodes.length }} / {{ snapshot.nodes.length }}</p>
                <Button type="button" variant="outline" size="icon" data-testid="export-machines" :aria-label="copy.exportData" @click="exportMachines">
                  <Download class="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button v-if="hasMachineFilters" type="button" variant="ghost" class="w-full sm:w-fit" data-testid="clear-machine-filters" @click="clearMachineFilters">
                  {{ copy.clearFilters }}
                </Button>
              </div>
              <Card class="w-full max-w-full min-w-0 overflow-x-auto" data-testid="machine-list">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{{ copy.devicesTableMachine }}</TableHead>
                      <TableHead>{{ copy.devicesTableUser }}</TableHead>
                      <TableHead>{{ copy.devicesTableRoutes }}</TableHead>
                      <TableHead>{{ copy.devicesTableActivity }}</TableHead>
                      <TableHead class="hidden md:table-cell">{{ copy.actions }}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="node in filteredNodes"
                      :key="node.id"
                      :data-testid="`device-${node.id}`"
                    >
                      <TableCell class="align-top md:min-w-64">
                        <div class="flex min-w-0 items-center gap-2">
                          <Network class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <button
                            type="button"
                            class="truncate font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            :data-testid="`device-detail-link-${node.id}`"
                            @click="openNodeDetails(node)"
                          >
                            {{ node.name }}
                          </button>
                        </div>
                        <div class="mt-2 flex flex-wrap gap-1">
                          <Badge
                            v-for="(address, addressIndex) in node.ipAddresses"
                            :key="address"
                            variant="outline"
                            class="border-slate-200 bg-muted/60 font-mono text-[11px] text-muted-foreground dark:border-slate-800"
                            :data-testid="`device-ip-${node.id}-${addressIndex}`"
                          >
                            {{ address }}
                          </Badge>
                        </div>
                        <div v-if="node.tags.length" class="mt-2 flex flex-wrap gap-1">
                          <Badge
                            v-for="(tag, tagIndex) in node.tags"
                            :key="tag"
                            variant="outline"
                            :class="deviceTagClass(tag)"
                            :data-testid="`device-tag-${node.id}-${tagIndex}`"
                          >
                            {{ tag }}
                          </Badge>
                        </div>
                        <div class="mt-2 md:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger as-child>
                              <Button
                                variant="outline"
                                size="icon"
                                :aria-label="`${copy.actions}: ${node.name}`"
                                :data-testid="`machine-actions-trigger-mobile-${node.id}`"
                              >
                                <EllipsisVertical class="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" class="w-64" :data-testid="`machine-actions-menu-mobile-${node.id}`">
                              <DropdownMenuLabel>{{ copy.actions }}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem :data-testid="`view-node-details-action-mobile-${node.id}`" @click="openNodeDetails(node)">
                                <FileCheck2 class="h-4 w-4" aria-hidden="true" />
                                {{ copy.viewDetails }}
                              </DropdownMenuItem>
                              <DropdownMenuItem :data-testid="`view-node-routes-action-mobile-${node.id}`" @click="jumpToRoutesForMachine(node)">
                                <Router class="h-4 w-4" aria-hidden="true" />
                                {{ copy.viewRoutes }}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem :data-testid="`rename-node-action-mobile-${node.id}`" @click="openRenameDialog(node)">
                                <Pencil class="h-4 w-4" aria-hidden="true" />
                                {{ copy.rename }}
                              </DropdownMenuItem>
                              <DropdownMenuItem :data-testid="`edit-node-tags-action-mobile-${node.id}`" @click="openTagsDialog(node)">
                                <ShieldCheck class="h-4 w-4" aria-hidden="true" />
                                {{ copy.editTags }}
                              </DropdownMenuItem>
                              <DropdownMenuItem :data-testid="`expire-node-action-mobile-${node.id}`" @click="openExpireDialog(node)">
                                <Clock class="h-4 w-4" aria-hidden="true" />
                                {{ copy.expire }}
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" :data-testid="`remove-node-action-mobile-${node.id}`" @click="openRemoveDialog(node)">
                                <Trash2 class="h-4 w-4" aria-hidden="true" />
                                {{ copy.remove }}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                      <TableCell class="align-top md:min-w-40">
                        <div v-if="hasVisibleUser(node.user)">
                          <button
                            type="button"
                            class="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            :data-testid="`device-owner-link-${node.id}`"
                            @click="openUserDetails(node.user)"
                          >
                            {{ nodeOwner(node) }}
                          </button>
                          <p class="text-xs text-muted-foreground">{{ node.user.email || node.user.name }}</p>
                        </div>
                        <span v-else aria-hidden="true" class="text-muted-foreground">-</span>
                      </TableCell>
                      <TableCell class="align-top md:min-w-56">
                        <button
                          v-if="nodePendingRoutes(node).length"
                          type="button"
                          class="flex flex-wrap gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          :data-testid="`device-pending-routes-${node.id}`"
                          @click="jumpToRoutesForMachine(node)"
                        >
                          <Badge
                            v-for="(route, routeIndex) in nodePendingRoutes(node)"
                            :key="route"
                            variant="outline"
                            class="cursor-pointer hover:opacity-90"
                            :class="pendingRouteClass(route)"
                            :data-testid="`device-pending-route-${node.id}-${routeIndex}`"
                          >
                            {{ route }}
                          </Badge>
                        </button>
                        <div
                          v-if="node.approvedRoutes.length"
                          class="flex flex-wrap gap-1"
                          :class="{ 'mt-2': nodePendingRoutes(node).length }"
                        >
                          <Badge
                            v-for="(route, routeIndex) in node.approvedRoutes"
                            :key="route"
                            variant="outline"
                            :class="approvedRouteClass()"
                            :data-testid="`device-approved-route-${node.id}-${routeIndex}`"
                          >
                            {{ route }}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell class="align-top md:min-w-44">
                        <Badge
                          variant="outline"
                          :class="nodeStatusClass(node)"
                          :data-testid="`device-status-${node.id}`"
                        >
                          <Wifi v-if="node.online" class="h-3 w-3" aria-hidden="true" />
                          <WifiOff v-else class="h-3 w-3" aria-hidden="true" />
                          {{ nodeStatusLabel(node) }}
                        </Badge>
                        <p class="mt-2 text-xs text-muted-foreground">{{ copy.lastSeen }}: {{ formatDate(node.lastSeen) }}</p>
                        <p class="text-xs text-muted-foreground">{{ copy.expires }}: {{ formatDate(node.expiry) }}</p>
                      </TableCell>
                      <TableCell class="hidden align-top md:table-cell md:min-w-16">
                        <div class="flex justify-start">
                          <DropdownMenu>
                            <DropdownMenuTrigger as-child>
                              <Button
                                variant="outline"
                                size="icon"
                                :aria-label="`${copy.actions}: ${node.name}`"
                                :data-testid="`machine-actions-trigger-${node.id}`"
                              >
                                <EllipsisVertical class="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" class="w-64" :data-testid="`machine-actions-menu-${node.id}`">
                              <DropdownMenuLabel>{{ copy.actions }}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem :data-testid="`view-node-details-action-${node.id}`" @click="openNodeDetails(node)">
                                <FileCheck2 class="h-4 w-4" aria-hidden="true" />
                                {{ copy.viewDetails }}
                              </DropdownMenuItem>
                              <DropdownMenuItem :data-testid="`view-node-routes-action-${node.id}`" @click="jumpToRoutesForMachine(node)">
                                <Router class="h-4 w-4" aria-hidden="true" />
                                {{ copy.viewRoutes }}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem :data-testid="`rename-node-action-${node.id}`" @click="openRenameDialog(node)">
                                <Pencil class="h-4 w-4" aria-hidden="true" />
                                {{ copy.rename }}
                              </DropdownMenuItem>
                              <DropdownMenuItem :data-testid="`edit-node-tags-action-${node.id}`" @click="openTagsDialog(node)">
                                <ShieldCheck class="h-4 w-4" aria-hidden="true" />
                                {{ copy.editTags }}
                              </DropdownMenuItem>
                              <DropdownMenuItem :data-testid="`expire-node-action-${node.id}`" @click="openExpireDialog(node)">
                                <Clock class="h-4 w-4" aria-hidden="true" />
                                {{ copy.expire }}
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" :data-testid="`remove-node-action-${node.id}`" @click="openRemoveDialog(node)">
                                <Trash2 class="h-4 w-4" aria-hidden="true" />
                                {{ copy.remove }}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow v-if="filteredNodes.length === 0">
                      <TableCell colspan="5" class="py-6 text-sm text-muted-foreground">
                        {{ copy.noDevices }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>

        </section>

        <section v-else-if="activeSection === 'members'" class="space-y-3 lg:space-y-4">
          <div>
            <h1 class="text-2xl font-semibold">{{ copy.membersTitle }}</h1>
            <p class="mt-1 text-sm text-muted-foreground">{{ copy.membersSubtitle }}</p>
          </div>

          <Dialog :open="memberDialogOpen" @update:open="handleMemberDialogOpen">
            <DialogContent data-testid="member-create-dialog" class="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{{ copy.addMember }}</DialogTitle>
                <DialogDescription>
                  {{ copy.membersSubtitle }}
                </DialogDescription>
              </DialogHeader>
              <form class="grid gap-3" data-testid="member-form" @submit.prevent="createMember">
                <div>
                  <Label for="member-name">{{ copy.memberName }}</Label>
                  <Input id="member-name" v-model="memberForm.name" data-testid="member-name" class="mt-2" required />
                </div>
                <div>
                  <Label for="member-display">{{ copy.displayName }}</Label>
                  <Input id="member-display" v-model="memberForm.displayName" data-testid="member-display" class="mt-2" />
                </div>
                <div>
                  <Label for="member-email">{{ copy.email }}</Label>
                  <Input id="member-email" v-model="memberForm.email" data-testid="member-email" class="mt-2" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" data-testid="cancel-create-member" @click="handleMemberDialogOpen(false)">
                    {{ copy.cancel }}
                  </Button>
                  <Button type="submit" data-testid="create-member">
                    <Plus class="h-4 w-4" aria-hidden="true" />
                    {{ copy.createMember }}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <div class="space-y-2" data-testid="user-table-shell">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center" data-testid="user-toolbar">
              <div class="w-full sm:max-w-sm">
                <Label for="user-search" class="sr-only">{{ copy.searchUsers }}</Label>
                <div class="relative">
                  <Search class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="user-search" v-model="userSearch" data-testid="user-search" class="ps-8" :placeholder="copy.searchUsers" />
                </div>
              </div>
              <div class="w-full sm:w-44">
                <Label for="user-filter" class="sr-only">{{ copy.filters }}</Label>
                <div class="relative">
                  <SlidersHorizontal class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <NativeSelect id="user-filter" v-model="userFilter" data-testid="user-filter" class="ps-8">
                    <NativeSelectOption value="all">{{ copy.allUsers }}</NativeSelectOption>
                    <NativeSelectOption value="owner">{{ copy.owners }}</NativeSelectOption>
                    <NativeSelectOption value="member">{{ copy.members }}</NativeSelectOption>
                    <NativeSelectOption value="service">{{ copy.serviceAccounts }}</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
              <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">{{ filteredUsers.length }} / {{ visibleUsers.length }}</p>
              <Button type="button" variant="outline" size="icon" data-testid="export-users" :aria-label="copy.exportData" @click="exportUsers">
                <Download class="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button data-testid="open-create-member" @click="openMemberDialog">
                <Plus class="h-4 w-4" aria-hidden="true" />
                {{ copy.addMember }}
              </Button>
            </div>
            <Card class="min-w-0 overflow-hidden" data-testid="user-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ copy.membersTitle }}</TableHead>
                    <TableHead>{{ copy.role }}</TableHead>
                    <TableHead data-testid="member-devices-header">{{ copy.memberDevices }}</TableHead>
                    <TableHead>{{ copy.joined }}</TableHead>
                    <TableHead>{{ copy.authSource }}</TableHead>
                    <TableHead class="hidden md:table-cell">{{ copy.actions }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="user in filteredUsers" :key="user.id" :data-testid="`member-${user.name}`">
                    <TableCell class="align-top md:min-w-56">
                      <button
                        type="button"
                        class="font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        :data-testid="`member-detail-link-${user.name}`"
                        @click="openUserDetails(user)"
                      >
                        {{ userLabel(user) }}
                      </button>
                      <p class="mt-1 break-all text-sm text-muted-foreground">{{ user.email || userAuthSource(user) }}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                          <Button
                            variant="outline"
                            size="icon"
                            class="mt-2 md:hidden"
                            :data-testid="`member-actions-trigger-mobile-${user.name}`"
                            :aria-label="`${copy.actions}: ${userLabel(user)}`"
                          >
                            <EllipsisVertical class="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" class="w-64" :data-testid="`member-actions-menu-mobile-${user.name}`">
                          <DropdownMenuLabel>{{ copy.actions }}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem :data-testid="`view-member-details-mobile-${user.name}`" @click="openUserDetails(user)">
                            <FileCheck2 class="h-4 w-4" aria-hidden="true" />
                            {{ copy.viewDetails }}
                          </DropdownMenuItem>
                          <DropdownMenuItem :data-testid="`view-member-machines-mobile-${user.name}`" @click="jumpToMachinesForUser(user)">
                            <Network class="h-4 w-4" aria-hidden="true" />
                            {{ copy.viewMachines }}
                          </DropdownMenuItem>
                          <DropdownMenuItem :data-testid="`create-invite-for-member-mobile-${user.name}`" @click="openInviteDialogForUser(user)">
                            <KeyRound class="h-4 w-4" aria-hidden="true" />
                            {{ copy.createInvite }}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem :data-testid="`rename-member-mobile-${user.name}`" @click="openRenameMemberDialog(user)">
                            <Pencil class="h-4 w-4" aria-hidden="true" />
                            {{ copy.renameMember }}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" :data-testid="`delete-member-mobile-${user.name}`" @click="requestDeleteMember(user)">
                            <Trash2 class="h-4 w-4" aria-hidden="true" />
                            {{ copy.deleteMember }}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell class="align-top md:min-w-32">
                      <Badge variant="outline">{{ userRole(user) }}</Badge>
                    </TableCell>
                    <TableCell class="align-top md:min-w-28">
                      <div v-if="userDevices(user).length" class="grid justify-items-start gap-1" :data-testid="`member-device-tags-${user.name}`">
                        <button
                          v-for="node in userDevices(user)"
                          :key="node.id"
                          type="button"
                          class="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          :data-testid="`member-device-tag-${user.name}-${node.id}`"
                          @click="openNodeDetails(node)"
                        >
                          <Badge variant="outline" :class="nodeStatusClass(node)" class="cursor-pointer">
                            {{ node.name }}
                          </Badge>
                        </button>
                      </div>
                      <span v-else aria-hidden="true" class="text-muted-foreground">-</span>
                    </TableCell>
                    <TableCell class="align-top text-sm text-muted-foreground md:min-w-40">{{ formatDate(user.createdAt) }}</TableCell>
                    <TableCell class="align-top md:min-w-36" :data-testid="`member-auth-source-${user.name}`">{{ userAuthSource(user) }}</TableCell>
                    <TableCell class="hidden align-top md:table-cell md:min-w-16">
                      <div class="flex justify-start">
                        <DropdownMenu>
                          <DropdownMenuTrigger as-child>
                            <Button
                              variant="outline"
                              size="icon"
                              :data-testid="`member-actions-trigger-${user.name}`"
                              :aria-label="`${copy.actions}: ${userLabel(user)}`"
                            >
                              <EllipsisVertical class="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" class="w-64" :data-testid="`member-actions-menu-${user.name}`">
                            <DropdownMenuLabel>{{ copy.actions }}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem :data-testid="`view-member-details-${user.name}`" @click="openUserDetails(user)">
                              <FileCheck2 class="h-4 w-4" aria-hidden="true" />
                              {{ copy.viewDetails }}
                            </DropdownMenuItem>
                            <DropdownMenuItem :data-testid="`view-member-machines-${user.name}`" @click="jumpToMachinesForUser(user)">
                              <Network class="h-4 w-4" aria-hidden="true" />
                              {{ copy.viewMachines }}
                            </DropdownMenuItem>
                            <DropdownMenuItem :data-testid="`create-invite-for-member-${user.name}`" @click="openInviteDialogForUser(user)">
                            <KeyRound class="h-4 w-4" aria-hidden="true" />
                            {{ copy.createInvite }}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                            <DropdownMenuItem :data-testid="`rename-member-${user.name}`" @click="openRenameMemberDialog(user)">
                              <Pencil class="h-4 w-4" aria-hidden="true" />
                              {{ copy.renameMember }}
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" :data-testid="`delete-member-${user.name}`" @click="requestDeleteMember(user)">
                              <Trash2 class="h-4 w-4" aria-hidden="true" />
                              {{ copy.deleteMember }}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="filteredUsers.length === 0">
                    <TableCell colspan="6" class="py-6 text-sm text-muted-foreground">
                      {{ copy.noUsersMatch }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        </section>

        <section v-else-if="activeSection === 'invites'" class="space-y-3 lg:space-y-4">
          <div class="grid gap-3">
            <div>
              <h1 class="text-xl font-semibold">{{ copy.invitesTitle }}</h1>
              <p class="mt-1 text-sm text-muted-foreground">{{ copy.invitesSubtitle }}</p>
            </div>
          </div>

          <div class="space-y-2" data-testid="invite-table-shell">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center" data-testid="invite-toolbar">
              <div class="w-full sm:max-w-sm">
                <Label for="invite-search" class="sr-only">{{ copy.searchAuthKeys }}</Label>
                <div class="relative">
                  <Search class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="invite-search"
                    v-model="inviteSearch"
                    data-testid="invite-search"
                    class="ps-8"
                    :placeholder="copy.searchAuthKeys"
                  />
                </div>
              </div>
              <div class="w-full sm:w-40">
                <Label for="invite-filter" class="sr-only">{{ copy.filters }}</Label>
                <div class="relative">
                  <Filter class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <NativeSelect id="invite-filter" v-model="inviteFilter" data-testid="invite-filter" class="ps-8">
                    <NativeSelectOption value="all">{{ copy.invitesTitle }}</NativeSelectOption>
                    <NativeSelectOption value="ready">{{ copy.readyKeys }}</NativeSelectOption>
                    <NativeSelectOption value="used">{{ copy.used }}</NativeSelectOption>
                    <NativeSelectOption value="expired">{{ copy.expiredOnly }}</NativeSelectOption>
                    <NativeSelectOption value="tagged">{{ copy.taggedKeys }}</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
              <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">{{ filteredPreAuthKeys.length }} / {{ snapshot.preAuthKeys.length }}</p>
              <Button data-testid="open-create-invite" @click="openInviteDialog">
                <Plus class="h-4 w-4" aria-hidden="true" />
                {{ copy.createInvite }}
              </Button>
            </div>
            <Card class="min-w-0 overflow-hidden" data-testid="invite-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ copy.status }}</TableHead>
                    <TableHead>{{ copy.inviteOwner }}</TableHead>
                    <TableHead>{{ copy.inviteKey }}</TableHead>
                    <TableHead>{{ copy.expires }}</TableHead>
                    <TableHead>{{ copy.aclTags }}</TableHead>
                    <TableHead>{{ copy.actions }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="key in filteredPreAuthKeys"
                    :key="key.id"
                    :data-testid="`invite-${key.id}`"
                  >
                    <TableCell class="w-28">
                      <Badge variant="outline" :class="keyStatusClass(key)" :data-testid="`invite-status-${key.id}`">{{ keyStatus(key) }}</Badge>
                    </TableCell>
                    <TableCell class="min-w-36 font-medium">
                      <button
                        v-if="hasVisibleUser(key.user)"
                        type="button"
                        class="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        :data-testid="`invite-owner-link-${key.id}`"
                        @click="openUserDetails(key.user)"
                      >
                        {{ userLabel(key.user) }}
                      </button>
                      <span v-else>{{ userLabel(key.user) }}</span>
                    </TableCell>
                    <TableCell class="min-w-64">
                      <code class="break-all rounded bg-secondary px-1.5 py-0.5 text-xs">{{ key.key }}</code>
                      <div class="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" :class="keyKindClass(key)" :data-testid="`invite-kind-${key.id}`">{{ key.reusable ? copy.reusable : copy.oneTimeKey }}</Badge>
                        <Badge v-if="key.ephemeral" variant="outline" :class="keyEphemeralClass()" :data-testid="`invite-ephemeral-${key.id}`">{{ copy.ephemeral }}</Badge>
                      </div>
                    </TableCell>
                    <TableCell class="min-w-40 text-sm text-muted-foreground">
                      {{ formatDate(key.expiration) }}
                    </TableCell>
                    <TableCell class="min-w-36">
                      <div v-if="key.aclTags.length" class="flex flex-wrap gap-1">
                        <Badge
                          v-for="(tag, tagIndex) in key.aclTags"
                          :key="tag"
                          variant="outline"
                          :class="keyTagClass(tag)"
                          :data-testid="`invite-tag-${key.id}-${tagIndex}`"
                        >
                          {{ tag }}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell class="min-w-48">
                      <div class="flex justify-start gap-2">
                        <Button size="sm" variant="outline" :data-testid="`expire-invite-${key.id}`" @click="requestInviteAction('expire', key)">{{ copy.expireInvite }}</Button>
                        <Button size="sm" variant="destructive" :data-testid="`delete-invite-${key.id}`" @click="requestInviteAction('delete', key)">{{ copy.deleteInvite }}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="filteredPreAuthKeys.length === 0">
                    <TableCell colspan="6" class="py-6 text-sm text-muted-foreground">
                      {{ copy.noAuthKeys }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>

            <Card v-if="lastCreatedInvite" class="p-3" data-testid="created-invite">
              <p class="text-sm text-muted-foreground">{{ copy.inviteKey }}</p>
              <div class="mt-2 grid gap-2">
                <code class="min-w-0 flex-1 break-all rounded-md bg-secondary px-2 py-1 text-xs">{{ lastCreatedInvite }}</code>
                <Button size="sm" variant="outline" class="w-full" data-testid="copy-created-invite" @click="copyInviteKey(lastCreatedInvite)">
                  <Copy class="h-4 w-4" aria-hidden="true" />
                  {{ copiedKey === lastCreatedInvite ? copy.copied : copy.copy }}
                </Button>
              </div>
              <p class="mt-4 text-sm text-muted-foreground">{{ copy.installCommand }}</p>
              <div class="mt-2 grid gap-2">
                <code class="break-all rounded-md bg-secondary px-2 py-1 text-xs">{{ installCommand }}</code>
                <Button size="sm" variant="outline" class="w-full" data-testid="copy-created-install-command" @click="copyInviteKey(installCommand)">
                  <Copy class="h-4 w-4" aria-hidden="true" />
                  {{ copiedKey === installCommand ? copy.copied : copy.copyCommand }}
                </Button>
              </div>
            </Card>
          </div>
        </section>

        <section v-else-if="activeSection === 'routes'" class="space-y-3 sm:space-y-4">
          <div>
            <h1 class="text-xl font-semibold">{{ copy.routesTitle }}</h1>
            <p class="mt-1 text-sm text-muted-foreground">{{ copy.routesSubtitle }}</p>
          </div>

          <div class="grid gap-2">
            <Card v-for="node in routeNodes" :key="node.id" class="overflow-hidden" :data-testid="`route-node-${node.id}`">
              <div class="grid gap-3 p-3">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="font-semibold">
                      <button
                        type="button"
                        class="inline-flex max-w-full items-center text-start underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        :data-testid="`route-machine-link-${node.id}`"
                        :aria-label="`${copy.viewMachine}: ${node.name}`"
                        @click="jumpToMachine(node)"
                      >
                        <span class="truncate">{{ node.name }}</span>
                      </button>
                    </h2>
                    <button
                      v-if="hasVisibleUser(node.user)"
                      type="button"
                      class="mt-1 inline-flex max-w-full text-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      :data-testid="`route-user-link-${node.id}`"
                      :aria-label="`${copy.viewUser}: ${nodeOwner(node)}`"
                      @click="jumpToUser(node.user)"
                    >
                      <span class="truncate">{{ nodeOwner(node) }}</span>
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="text-muted-foreground hover:text-foreground"
                    :disabled="nodePendingRoutes(node).length === 0"
                    :data-testid="`approve-routes-${node.id}`"
                    @click="requestApproveRoutes(node)"
                  >
                    <Router class="h-4 w-4" aria-hidden="true" />
                    {{ nodePendingRoutes(node).length === 0 ? copy.routesApproved : copy.approveAll }}
                  </Button>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="grid gap-2">
                    <p class="text-xs font-medium text-muted-foreground">{{ copy.availableRoutes }}</p>
                    <div class="flex flex-wrap gap-1.5">
                      <Badge
                        v-for="(route, routeIndex) in node.availableRoutes"
                        :key="route"
                        variant="outline"
                        class="max-w-full justify-start whitespace-normal break-all font-mono"
                        :data-testid="`route-available-${node.id}-${routeIndex}`"
                      >
                        {{ route }}
                      </Badge>
                      <span v-if="node.availableRoutes.length === 0" class="text-xs text-muted-foreground">
                        {{ copy.noRouteValues }}
                      </span>
                    </div>
                  </div>
                  <div class="grid gap-2">
                    <p class="text-xs font-medium text-muted-foreground">{{ copy.approvedRoutes }}</p>
                    <div class="flex flex-wrap gap-1.5">
                      <Badge
                        v-for="(route, routeIndex) in node.approvedRoutes"
                        :key="route"
                        variant="secondary"
                        class="max-w-full justify-start whitespace-normal break-all font-mono"
                        :data-testid="`route-approved-${node.id}-${routeIndex}`"
                      >
                        {{ route }}
                      </Badge>
                      <span v-if="node.approvedRoutes.length === 0" class="text-xs text-muted-foreground">
                        {{ copy.noRouteValues }}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  v-if="nodePendingRoutes(node).length > 0"
                  class="overflow-hidden rounded-md border bg-background/45"
                  :data-testid="`pending-routes-list-${node.id}`"
                >
                  <div
                    v-for="(route, routeIndex) in nodePendingRoutes(node)"
                    :key="route"
                    class="grid gap-2 border-t px-3 py-2 first:border-t-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                    :data-testid="`pending-route-${node.id}-${routeIndex}`"
                  >
                    <Badge :variant="isExitRoute(route) ? 'destructive' : 'outline'" class="justify-self-start">
                      {{ isExitRoute(route) ? copy.exitRoute : copy.pendingRoutes }}
                    </Badge>
                    <Badge
                      variant="secondary"
                      class="max-w-full justify-self-start whitespace-normal break-all font-mono"
                      :data-testid="`pending-route-value-${node.id}-${routeIndex}`"
                    >
                      {{ route }}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      class="justify-self-start sm:justify-self-end"
                      :class="isExitRoute(route) ? 'border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive' : undefined"
                      :data-testid="`approve-route-${node.id}-${routeIndex}`"
                      @click="openRouteApprovalDialog(node, route)"
                    >
                      <Router class="h-4 w-4" aria-hidden="true" />
                      {{ copy.approveRoute }}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
            <p v-if="routeNodes.length === 0" class="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
              {{ copy.noRoutes }}
            </p>
          </div>

          <AlertDialog :open="routeApprovalDialogOpen" @update:open="handleRouteApprovalDialogOpen">
            <AlertDialogContent v-if="selectedRouteApproval" data-testid="approve-route-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {{
                    isExitRoute(selectedRouteApproval.route)
                      ? copy.approveExitRouteTitle
                      : copy.approveRouteTitle
                  }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {{
                    isExitRoute(selectedRouteApproval.route)
                      ? copy.approveExitRouteDescription
                      : copy.approveRouteDescription
                  }}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div class="text-muted-foreground">{{ selectedRouteApproval.node.name }}</div>
                <div class="mt-1 break-all font-medium" data-testid="approve-route-target">
                  {{ selectedRouteApproval.route }}
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="approve-route-cancel">{{ copy.cancel }}</AlertDialogCancel>
                <Button
                  :variant="isExitRoute(selectedRouteApproval.route) ? 'destructive' : 'default'"
                  data-testid="approve-route-confirm"
                  @click="confirmApproveRoute"
                >
                  <Router class="h-4 w-4" aria-hidden="true" />
                  {{ copy.approveRoute }}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog :open="Boolean(selectedRoutesApprovalNode)" @update:open="handleApproveRoutesDialogOpen">
            <AlertDialogContent v-if="selectedRoutesApprovalNode" data-testid="approve-routes-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {{ selectedRoutesApprovalHasExitRoute ? copy.approveExitRoutesTitle : copy.approveRoutesTitle }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {{ selectedRoutesApprovalHasExitRoute ? copy.approveExitRoutesDescription : copy.approveRoutesDescription }}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div class="grid gap-2 rounded-md border bg-muted/30 p-3">
                <p class="text-sm font-medium">{{ selectedRoutesApprovalNode.name }}</p>
                <Badge
                  v-for="(route, routeIndex) in selectedRoutesApprovalPending"
                  :key="route"
                  variant="outline"
                  class="w-fit max-w-full whitespace-normal break-all font-mono"
                  :class="pendingRouteClass(route)"
                  :data-testid="`approve-routes-target-${routeIndex}`"
                >
                  {{ route }}
                </Badge>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="approve-routes-cancel">{{ copy.cancel }}</AlertDialogCancel>
                <Button
                  type="button"
                  :variant="selectedRoutesApprovalHasExitRoute ? 'destructive' : 'default'"
                  data-testid="approve-routes-confirm"
                  @click="confirmApproveRoutes"
                >
                  <Router class="h-4 w-4" aria-hidden="true" />
                  {{ copy.confirmApproveRoutes }}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        <section v-else-if="activeSection === 'access'" class="space-y-3 sm:space-y-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold">{{ copy.accessTitle }}</h1>
              <p class="mt-1 text-sm text-muted-foreground">{{ copy.accessSubtitle }}</p>
            </div>
            <Button size="sm" data-testid="save-policy" @click="savePolicy">
              <FileCheck2 class="h-4 w-4" aria-hidden="true" />
              {{ copy.savePolicy }}
            </Button>
          </div>

          <Card class="p-3" data-testid="policy-editor">
            <div class="grid gap-3">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary" data-testid="policy-summary-rules-count">
                  {{ copy.policyOverviewRules }} {{ policyRules.length }}
                </Badge>
                <Badge variant="secondary" data-testid="policy-summary-groups-count">
                  {{ copy.policyOverviewGroups }} {{ policyGroups.length }}
                </Badge>
                <Badge variant="secondary" data-testid="policy-summary-tag-owners-count">
                  {{ copy.policyOverviewTags }} {{ policyTagOwners.length }}
                </Badge>
                <Badge
                  :variant="policyRiskCount > 0 ? 'destructive' : 'outline'"
                  data-testid="policy-summary-warnings-count"
                >
                  {{ copy.policyOverviewWarnings }} {{ policyRiskCount }}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground">{{ policyWorkspaceSummary }}</p>

              <Tabs
                :model-value="activePolicyTab"
                :dir="meta.dir"
                class="w-full min-w-0"
                data-testid="policy-workspace-tabs"
                @update:model-value="changePolicyTab"
              >
                <TabsList class="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
                  <TabsTrigger value="rules" data-testid="policy-tab-rules" class="flex-none">
                    {{ copy.policyRulesTab }}
                  </TabsTrigger>
                  <TabsTrigger value="groups" data-testid="policy-tab-groups" class="flex-none">
                    {{ copy.policyGroupsTab }}
                  </TabsTrigger>
                  <TabsTrigger value="tags" data-testid="policy-tab-tags" class="flex-none">
                    {{ copy.policyTagOwnersTab }}
                  </TabsTrigger>
                  <TabsTrigger value="review" data-testid="policy-tab-review" class="flex-none">
                    {{ copy.policyReviewTab }}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="rules" class="mt-3 space-y-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center" data-testid="policy-rules-toolbar">
                    <div class="w-full sm:max-w-sm">
                      <Label for="policy-rule-search" class="sr-only">{{ copy.searchPolicyRules }}</Label>
                      <div class="relative">
                        <Search class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input id="policy-rule-search" v-model="policyRuleSearch" data-testid="policy-rule-search" class="ps-8" :placeholder="copy.searchPolicyRules" />
                      </div>
                    </div>
                    <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">{{ filteredPolicyRules.length }} / {{ policyRules.length }}</p>
                    <Button type="button" data-testid="open-policy-rule-dialog" @click="openPolicyRuleDialog">
                      <Plus class="h-4 w-4" aria-hidden="true" />
                      {{ copy.addRule }}
                    </Button>
                  </div>

                  <Dialog :open="policyRuleDialogOpen" @update:open="handlePolicyRuleDialogOpen">
                    <DialogContent class="sm:max-w-xl" data-testid="policy-rule-dialog">
                      <DialogHeader>
                        <DialogTitle>{{ copy.policyQuickStartTitle }}</DialogTitle>
                        <DialogDescription>{{ copy.policyQuickStartDescription }}</DialogDescription>
                      </DialogHeader>
                      <form class="grid gap-3" data-testid="policy-rule-form" @submit.prevent="addPolicyRule">
                        <div>
                          <Label for="policy-simple-source">{{ copy.policyWhoCanAccess }}</Label>
                          <NativeSelect
                            id="policy-simple-source"
                            v-model="policyRuleForm.source"
                            data-testid="policy-simple-source"
                            class="mt-2"
                          >
                            <NativeSelectOption
                              v-for="choice in policySourceChoices"
                              :key="choice.id"
                              :value="choice.value"
                            >
                              {{ choice.label }}
                            </NativeSelectOption>
                          </NativeSelect>
                        </div>
                        <div>
                          <Label for="policy-simple-destination">{{ copy.policyWhatCanAccess }}</Label>
                          <NativeSelect
                            id="policy-simple-destination"
                            v-model="policyRuleForm.destination"
                            data-testid="policy-simple-destination"
                            class="mt-2"
                          >
                            <NativeSelectOption
                              v-for="choice in policyDestinationChoices"
                              :key="choice.id"
                              :value="choice.value"
                            >
                              {{ choice.label }}
                            </NativeSelectOption>
                          </NativeSelect>
                        </div>
                        <div>
                          <Label for="policy-simple-ports">{{ copy.policyWhichService }}</Label>
                          <NativeSelect
                            id="policy-simple-ports"
                            v-model="policyRuleForm.ports"
                            data-testid="policy-simple-ports"
                            class="mt-2"
                          >
                            <NativeSelectOption
                              v-for="choice in policyServiceChoices"
                              :key="choice.id"
                              :value="choice.value"
                            >
                              {{ choice.label }}
                            </NativeSelectOption>
                          </NativeSelect>
                        </div>
                        <div class="rounded-md border bg-background p-3">
                          <p class="text-sm" data-testid="policy-rule-preview">
                            <span class="block text-xs font-medium text-muted-foreground">
                              {{ copy.policySimplePreview }}
                            </span>
                            {{ policyRulePreview }}
                          </p>
                        </div>
                        <DialogFooter>
                          <Button type="submit" data-testid="add-policy-rule">
                            <Plus class="h-4 w-4" aria-hidden="true" />
                            {{ copy.addRule }}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Card class="min-w-0 overflow-hidden" data-testid="policy-rules-table">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{{ copy.policyRulesTableRule }}</TableHead>
                          <TableHead>{{ copy.policyRulesTableSource }}</TableHead>
                          <TableHead>{{ copy.policyRulesTableDestination }}</TableHead>
                          <TableHead>{{ copy.policyRulesTableService }}</TableHead>
                          <TableHead>{{ copy.policyRulesTableRisk }}</TableHead>
                          <TableHead>{{ copy.policyRulesTableActions }}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow v-if="filteredPolicyRules.length === 0">
                          <TableCell colspan="6" class="py-6 text-muted-foreground">
                            {{ copy.noPolicyRules }}
                          </TableCell>
                        </TableRow>
                        <TableRow
                          v-for="rule in filteredPolicyRules"
                          :key="rule.id"
                          :data-testid="`policy-rule-${rule.id}`"
                        >
                          <TableCell class="min-w-[18rem]">
                            <p class="font-medium">{{ policyRuleSentence(rule.source, rule.destination, rule.ports) }}</p>
                          </TableCell>
                          <TableCell class="break-all">{{ policyChoiceLabel("source", rule.source) }}</TableCell>
                          <TableCell class="break-all">{{ policyChoiceLabel("destination", rule.destination) }}</TableCell>
                          <TableCell>{{ policyChoiceLabel("ports", rule.ports) }}</TableCell>
                          <TableCell>
                            <Badge :variant="isPolicyRuleHighRisk(rule) ? 'destructive' : 'outline'">
                              {{ isPolicyRuleHighRisk(rule) ? copy.highRisk : copy.readyToSave }}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              :data-testid="`remove-policy-rule-${rule.id}`"
                              @click="requestRemovePolicyRule(rule)"
                            >
                              {{ copy.removeItem }}
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="groups" class="mt-3 space-y-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center" data-testid="policy-groups-toolbar">
                    <div class="w-full sm:max-w-sm">
                      <Label for="policy-group-search" class="sr-only">{{ copy.searchPolicyGroups }}</Label>
                      <div class="relative">
                        <Search class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input id="policy-group-search" v-model="policyGroupSearch" data-testid="policy-group-search" class="ps-8" :placeholder="copy.searchPolicyGroups" />
                      </div>
                    </div>
                    <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">{{ filteredPolicyGroups.length }} / {{ policyGroups.length }}</p>
                    <Button type="button" data-testid="open-policy-group-dialog" @click="openPolicyGroupDialog">
                      <Plus class="h-4 w-4" aria-hidden="true" />
                      {{ copy.addGroup }}
                    </Button>
                  </div>

                  <Dialog :open="policyGroupDialogOpen" @update:open="handlePolicyGroupDialogOpen">
                    <DialogContent class="sm:max-w-xl" data-testid="policy-group-dialog">
                      <DialogHeader>
                        <DialogTitle>{{ copy.addGroup }}</DialogTitle>
                        <DialogDescription>{{ copy.groupMemberPicker }}</DialogDescription>
                      </DialogHeader>
                      <form class="grid gap-3" data-testid="policy-group-form" @submit.prevent="addPolicyGroup">
                        <div>
                          <Label for="policy-group-name">{{ copy.groupName }}</Label>
                          <NativeSelect id="policy-group-name" v-model="policyGroupForm.name" data-testid="policy-group-name" class="mt-2">
                            <NativeSelectOption v-for="groupName in policyGroupNameChoices" :key="groupName" :value="groupName">
                              {{ groupName }}
                            </NativeSelectOption>
                          </NativeSelect>
                        </div>
                        <div>
                          <Label for="policy-group-member-select">{{ copy.selectGroupMember }}</Label>
                          <div class="mt-2 grid gap-2">
                            <NativeSelect
                              id="policy-group-member-select"
                              v-model="policyGroupMemberSelection"
                              data-testid="policy-group-member-select"
                            >
                              <NativeSelectOption value="" disabled>{{ copy.selectGroupMember }}</NativeSelectOption>
                              <NativeSelectOption
                                v-for="choice in policyMemberChoices"
                                :key="choice.id"
                                :value="choice.value"
                              >
                                {{ choice.label }}
                              </NativeSelectOption>
                            </NativeSelect>
                            <Button
                              type="button"
                              variant="outline"
                              data-testid="add-policy-group-member"
                              @click="addSelectedPolicyGroupMember"
                            >
                              <Plus class="h-4 w-4" aria-hidden="true" />
                              {{ copy.addSelectedMember }}
                            </Button>
                          </div>
                        </div>
                        <div class="rounded-md border bg-background px-3 py-2" data-testid="policy-group-members">
                          <p class="text-xs font-medium text-muted-foreground">{{ copy.selectedMembers }}</p>
                          <p class="mt-1 min-h-6 break-all text-sm font-medium">
                            {{ policyGroupForm.members || copy.selectGroupMember }}
                          </p>
                        </div>
                        <DialogFooter>
                          <Button type="submit" data-testid="add-policy-group">
                            <Plus class="h-4 w-4" aria-hidden="true" />
                            {{ copy.addGroup }}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Card class="min-w-0 overflow-hidden" data-testid="policy-groups-table">
                    <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{{ copy.groupName }}</TableHead>
                            <TableHead>{{ copy.groupMembers }}</TableHead>
                            <TableHead>{{ copy.actions }}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow v-if="filteredPolicyGroups.length === 0">
                            <TableCell colspan="3" class="py-6 text-muted-foreground">
                              {{ copy.noPolicyGroups }}
                            </TableCell>
                          </TableRow>
                          <TableRow
                            v-for="group in filteredPolicyGroups"
                            :key="group.id"
                            :data-testid="`policy-group-${group.id}`"
                          >
                            <TableCell class="font-medium">{{ group.name }}</TableCell>
                            <TableCell class="break-all text-muted-foreground">{{ group.members }}</TableCell>
                            <TableCell>
                              <Button type="button" variant="destructive" size="sm" :data-testid="`remove-policy-group-${group.id}`" @click="requestRemovePolicyGroup(group)">
                                {{ copy.removeItem }}
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="tags" class="mt-3 space-y-2">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center" data-testid="policy-tag-owners-toolbar">
                    <div class="w-full sm:max-w-sm">
                      <Label for="policy-tag-owner-search" class="sr-only">{{ copy.searchPolicyTagOwners }}</Label>
                      <div class="relative">
                        <Search class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input id="policy-tag-owner-search" v-model="policyTagOwnerSearch" data-testid="policy-tag-owner-search" class="ps-8" :placeholder="copy.searchPolicyTagOwners" />
                      </div>
                    </div>
                    <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">{{ filteredPolicyTagOwners.length }} / {{ policyTagOwners.length }}</p>
                    <Button type="button" data-testid="open-policy-tag-owner-dialog" @click="openPolicyTagOwnerDialog">
                      <Plus class="h-4 w-4" aria-hidden="true" />
                      {{ copy.addTagOwner }}
                    </Button>
                  </div>

                  <Dialog :open="policyTagOwnerDialogOpen" @update:open="handlePolicyTagOwnerDialogOpen">
                    <DialogContent class="sm:max-w-xl" data-testid="policy-tag-owner-dialog">
                      <DialogHeader>
                        <DialogTitle>{{ copy.addTagOwner }}</DialogTitle>
                        <DialogDescription>{{ copy.tagOwnerPicker }}</DialogDescription>
                      </DialogHeader>
                      <form class="grid gap-3" data-testid="policy-tag-owner-form" @submit.prevent="addPolicyTagOwner">
                        <div>
                          <Label for="policy-tag-name">{{ copy.tagName }}</Label>
                          <NativeSelect id="policy-tag-name" v-model="policyTagOwnerForm.tag" data-testid="policy-tag-name" class="mt-2">
                            <NativeSelectOption v-for="tagName in policyTagNameChoices" :key="tagName" :value="tagName">
                              {{ tagName }}
                            </NativeSelectOption>
                          </NativeSelect>
                        </div>
                        <div>
                          <Label for="policy-tag-owner-select">{{ copy.selectTagOwner }}</Label>
                          <div class="mt-2 grid gap-2">
                            <NativeSelect
                              id="policy-tag-owner-select"
                              v-model="policyTagOwnerSelection"
                              data-testid="policy-tag-owner-select"
                            >
                              <NativeSelectOption value="" disabled>{{ copy.selectTagOwner }}</NativeSelectOption>
                              <NativeSelectOption
                                v-for="choice in policyOwnerChoices"
                                :key="choice.id"
                                :value="choice.value"
                              >
                                {{ choice.label }}
                              </NativeSelectOption>
                            </NativeSelect>
                            <Button
                              type="button"
                              variant="outline"
                              data-testid="add-policy-tag-owner-selection"
                              @click="addSelectedPolicyTagOwner"
                            >
                              <Plus class="h-4 w-4" aria-hidden="true" />
                              {{ copy.addSelectedOwner }}
                            </Button>
                          </div>
                        </div>
                        <div class="rounded-md border bg-background px-3 py-2" data-testid="policy-tag-owners">
                          <p class="text-xs font-medium text-muted-foreground">{{ copy.selectedOwners }}</p>
                          <p class="mt-1 min-h-6 break-all text-sm font-medium">
                            {{ policyTagOwnerForm.owners || copy.selectTagOwner }}
                          </p>
                        </div>
                        <DialogFooter>
                          <Button type="submit" data-testid="add-policy-tag-owner">
                            <Plus class="h-4 w-4" aria-hidden="true" />
                            {{ copy.addTagOwner }}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Card class="min-w-0 overflow-hidden" data-testid="policy-tag-owners-table">
                    <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{{ copy.tagName }}</TableHead>
                            <TableHead>{{ copy.ownersList }}</TableHead>
                            <TableHead>{{ copy.actions }}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow v-if="filteredPolicyTagOwners.length === 0">
                            <TableCell colspan="3" class="py-6 text-muted-foreground">
                              {{ copy.noPolicyTagOwners }}
                            </TableCell>
                          </TableRow>
                          <TableRow
                            v-for="tagOwner in filteredPolicyTagOwners"
                            :key="tagOwner.id"
                            :data-testid="`policy-tag-owner-${tagOwner.id}`"
                          >
                            <TableCell class="font-medium">{{ tagOwner.tag }}</TableCell>
                            <TableCell class="break-all text-muted-foreground">{{ tagOwner.owners }}</TableCell>
                            <TableCell>
                              <Button type="button" variant="destructive" size="sm" :data-testid="`remove-policy-tag-owner-${tagOwner.id}`" @click="requestRemovePolicyTagOwner(tagOwner)">
                                {{ copy.removeItem }}
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="review" class="mt-3 grid gap-3">
                  <div class="rounded-md border p-3" data-testid="policy-safety-review">
                    <h2 class="font-semibold">{{ copy.safetyReview }}</h2>
                    <div class="mt-3 grid gap-2">
                      <p
                        v-if="policyWarnings.length === 0"
                        class="rounded-md border border-accent bg-accent/20 px-3 py-2 text-sm"
                        data-testid="policy-ready-to-save"
                      >
                        {{ copy.noPolicyWarnings }}
                      </p>
                      <p
                        v-for="warning in policyWarnings"
                        :key="warning"
                        class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      >
                        {{ warning }}
                      </p>
                    </div>
                  </div>

                  <div class="rounded-md border p-3">
                    <h2 class="font-semibold">{{ copy.preservedPolicySections }}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {{ copy.preservedPolicySectionsDescription }}
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <Badge
                        v-for="section in policyExtraSectionKeys"
                        :key="section"
                        variant="outline"
                      >
                        {{ section }}
                      </Badge>
                      <p v-if="policyExtraSectionKeys.length === 0" class="text-sm text-muted-foreground">
                        {{ copy.noPreservedPolicySections }}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>

          <AlertDialog :open="policyRemovalDialogOpen" @update:open="handlePolicyRemovalDialogOpen">
            <AlertDialogContent data-testid="remove-policy-item-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>{{ copy.confirmRemovePolicyItemTitle }}</AlertDialogTitle>
                <AlertDialogDescription>
                  {{ copy.confirmRemovePolicyItemDescription }}
                  <span v-if="pendingPolicyRemoval" class="mt-2 block break-all font-medium text-foreground">
                    {{ pendingPolicyRemoval.label }}
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="cancel-remove-policy-item">{{ copy.cancel }}</AlertDialogCancel>
                <AlertDialogAction
                  data-testid="confirm-remove-policy-item"
                  class="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40"
                  @click="confirmRemovePolicyItem"
                >
                  {{ copy.removeItem }}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div class="flex justify-end sm:hidden">
            <Button data-testid="save-policy-sticky" class="shadow-lg" @click="savePolicy">
              <FileCheck2 class="h-4 w-4" aria-hidden="true" />
              {{ copy.savePolicy }}
            </Button>
          </div>
        </section>

      </section>
    </div>
  </main>
</template>
