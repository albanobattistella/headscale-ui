<script setup lang="ts">
import {
  Activity,
  ArrowLeft,
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
  LogOut,
  Monitor,
  Moon,
  Network,
  Pencil,
  Plus,
  Router,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
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
import { LOCALE_META, type Locale, SUPPORTED_LOCALES, useHeadscaleI18n } from "@/i18n";

const { t, locale, setLocale } = useHeadscaleI18n();
const legacyConnectionStorageKey = "headscale-ui-connection";
const profilesStorageKey = "headscale-ui-profiles";
const activeProfileStorageKey = "headscale-ui-active-profile";
const themeStorageKey = "headscale-ui-theme";
const newProfileId = "__new__";
const localMockBaseUrl = "http://127.0.0.1:8080";
type ThemeMode = "light" | "dark" | "auto";
type ProductSection = "home" | "devices" | "members" | "invites" | "routes" | "access";
type MachineFilter = "all" | "online" | "offline" | "expired" | "routes" | "tagged";
type UserFilter = "all" | "owner" | "member" | "service";
type InviteFilter = "all" | "ready" | "used" | "expired" | "tagged";
type AddDeviceTask = "server" | "client";
type ProfileSubmenu = "language" | "theme";
type ServerSignalStrength = "strong" | "good" | "weak" | "poor" | "offline";
type RouteApprovalTarget = {
  node: HeadscaleNode;
  route: string;
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

type ConnectionProfile = ConnectionSettings & {
  id: string;
  name: string;
  updatedAt: string;
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
  backToMachines: "Back to all machines",
  deviceSetupLead: "Select preferences for your device to generate an install command.",
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
  noPendingRoutes: "No pending routes",
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
  routes: "Routes",
  lastSeen: "Last seen",
  expires: "Expires",
  status: "Status",
  actions: "Actions",
  details: "Details",
  unknown: "Unknown",
  noTags: "No tags",
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
  tagManagedDevices: "Devices managed by tags",
  role: "Role",
  joined: "Joined",
  authSource: "Auth source",
  memberName: "User name",
  displayName: "Display name",
  email: "Email",
  createMember: "Create user",
  deviceCount: "devices",
  deleteMember: "Delete user",
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
  existingRules: "Current access rules",
  noPolicyRules: "No access rules yet.",
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
  refreshData: "Refresh data",
  lastUpdated: "Last updated",
} as const;

type ProductCopy = typeof englishCopy;

const productCopy: Record<Locale, ProductCopy> = {
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
    backToMachines: "返回全部机器",
    deviceSetupLead: "选择设备偏好，然后生成安装命令。",
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
    noPendingRoutes: "无待审路由",
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
    routes: "路由",
    lastSeen: "最后在线",
    expires: "过期时间",
    status: "状态",
    actions: "操作",
    details: "详情",
    unknown: "未知",
    noTags: "无标签",
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
    tagManagedDevices: "使用标签管理的设备",
    role: "角色",
    joined: "加入时间",
    authSource: "认证来源",
    memberName: "用户名",
    displayName: "显示名称",
    email: "邮箱",
    createMember: "创建用户",
    deviceCount: "台设备",
    deleteMember: "删除用户",
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
    existingRules: "当前访问规则",
    noPolicyRules: "还没有访问规则。",
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
    tagManagedDevices: "Appareils gérés par tags",
    time: "Heure",
    hour: "Heure",
    minute: "Minute",
    devicesTitle: "Machines",
    membersTitle: "Utilisateurs",
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
    tagManagedDevices: "Устройства, управляемые тегами",
    time: "Время",
    hour: "Час",
    minute: "Минута",
    devicesTitle: "Машины",
    membersTitle: "Пользователи",
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
    tagManagedDevices: "Dispositivos gestionados por etiquetas",
    time: "Hora",
    hour: "Hora",
    minute: "Minuto",
    devicesTitle: "Máquinas",
    membersTitle: "Usuarios",
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
    tagManagedDevices: "الأجهزة المدارة بالوسوم",
    time: "الوقت",
    hour: "الساعة",
    minute: "الدقيقة",
    devicesTitle: "الأجهزة",
    membersTitle: "المستخدمون",
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
    existingRules: "قواعد الوصول الحالية",
    noPolicyRules: "لا توجد قواعد وصول بعد.",
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
    remember: true,
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

function loadConnectionProfiles(): ConnectionProfile[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  const savedProfiles = localStorage.getItem(profilesStorageKey);
  if (savedProfiles) {
    try {
      const parsed = JSON.parse(savedProfiles) as Partial<ConnectionProfile>[];
      return parsed
        .map((profile) => normalizeProfile(profile))
        .filter((profile) => profile !== null);
    } catch {
      localStorage.removeItem(profilesStorageKey);
    }
  }

  const legacyConnection = localStorage.getItem(legacyConnectionStorageKey);
  if (!legacyConnection) {
    return [];
  }

  try {
    const migrated = normalizeProfile({
      ...(JSON.parse(legacyConnection) as Partial<ConnectionProfile>),
      name: "Default",
    });
    localStorage.removeItem(legacyConnectionStorageKey);
    if (!migrated) {
      return [];
    }
    localStorage.setItem(profilesStorageKey, JSON.stringify([migrated]));
    localStorage.setItem(activeProfileStorageKey, migrated.id);
    return [migrated];
  } catch {
    localStorage.removeItem(legacyConnectionStorageKey);
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
const profileMenuOpen = ref(false);
const profileSubmenu = ref<ProfileSubmenu | null>(null);
const deviceSetupTask = ref<AddDeviceTask | null>(null);
const activeSection = ref<ProductSection>("home");
const lastError = ref("");
const copiedKey = ref("");
const lastCreatedInvite = ref("");
const policyDraft = ref("");
const activePolicyTab = ref<PolicyWorkspaceTab>("rules");
const policyGroupMemberSelection = ref("");
const policyTagOwnerSelection = ref("");
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
const expireDialogOpen = ref(false);
const removeDialogOpen = ref(false);
const routeApprovalDialogOpen = ref(false);
const selectedRenameNode = ref<HeadscaleNode | null>(null);
const selectedExpireNode = ref<HeadscaleNode | null>(null);
const selectedRemoveNode = ref<HeadscaleNode | null>(null);
const selectedRouteApproval = ref<RouteApprovalTarget | null>(null);
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
const policyRules = ref<PolicyRule[]>([]);
const policyGroups = ref<PolicyGroup[]>([]);
const policyTagOwners = ref<PolicyTagOwner[]>([]);
const policyExtraSections = ref<Record<string, unknown>>({});
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
const filteredNodes = computed(() => {
  const query = deviceSearch.value.trim().toLowerCase();
  return snapshot.value.nodes.filter((node) => {
    const searchable = [
      node.name,
      node.givenName,
      node.user?.name,
      node.user?.email,
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
  return snapshot.value.users.filter((user) => {
    const role = userRole(user).toLowerCase();
    const searchable = [
      user.name,
      user.displayName,
      userLabel(user),
      user.email,
      user.provider,
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
const authKeyDialogUsers = computed(() =>
  snapshot.value.users.map((user) => ({
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
  if (deviceSetupTask.value === "server") {
    return copy.value.addLinuxServerTitle;
  }
  return copy.value.addClientDeviceTitle;
});
const deviceSetupDescription = computed(() =>
  deviceSetupTask.value === "server"
    ? copy.value.linuxServerDescription
    : copy.value.clientDeviceDescription,
);
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
  snapshot.value.users
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
    ...snapshot.value.users
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
const themeLabel = computed(() => themeModeLabel(colorMode.value));
const currentProfileLabel = computed(() => connectionForm.profileName || t("profile"));
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

function saveProfiles() {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(profilesStorageKey, JSON.stringify(profiles.value));
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
  saveProfiles();

  if (typeof localStorage !== "undefined" && connectionForm.remember) {
    localStorage.setItem(activeProfileStorageKey, profile.id);
  } else if (typeof localStorage !== "undefined") {
    localStorage.removeItem(activeProfileStorageKey);
  }

  return profile.id;
}

async function authorizeProfile(profile: ConnectionProfile, section: ProductSection) {
  Object.assign(connectionForm, profileToForm(profile));
  const nextSettings: ConnectionSettings = {
    mode: profile.mode,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
  };

  setActiveSection(section);
  isConnecting.value = true;
  lastError.value = "";

  try {
    const nextSnapshot = await fetchSnapshot(createClient(nextSettings));
    settings.mode = nextSettings.mode;
    settings.baseUrl = nextSettings.baseUrl;
    settings.apiKey = nextSettings.apiKey;
    applySnapshot(nextSnapshot);
    isAuthorized.value = true;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(activeProfileStorageKey, profile.id);
    }
  } catch (error) {
    isAuthorized.value = false;
    lastError.value = error instanceof Error ? error.message : String(error);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(activeProfileStorageKey);
    }
  } finally {
    isConnecting.value = false;
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
      lastError.value = "";
      return;
    }

    const section = routeSection();
    setActiveSection(section);

    if (isAuthorized.value && connectionForm.profileId === profileId) {
      return;
    }

    const profile = profiles.value.find((item) => item.id === profileId);
    if (!profile) {
      isAuthorized.value = false;
      lastError.value = "Profile not found.";
      loadProfile(newProfileId);
      return;
    }

    await authorizeProfile(profile, section);
  } finally {
    if (generation === profileRouteSyncGeneration) {
      isRestoringSession.value = false;
    }
  }
}

async function connect() {
  const baseUrl = connectionForm.baseUrl.trim();
  const nextSettings: ConnectionSettings = {
    mode: resolveConnectionMode(connectionForm.mode, baseUrl),
    baseUrl,
    apiKey: connectionForm.apiKey.trim(),
  };

  isConnecting.value = true;
  lastError.value = "";
  connectionForm.mode = nextSettings.mode;

  try {
    const nextSnapshot = await fetchSnapshot(createClient(nextSettings));
    settings.mode = nextSettings.mode;
    settings.baseUrl = nextSettings.baseUrl;
    settings.apiKey = nextSettings.apiKey;
    applySnapshot(nextSnapshot);
    isAuthorized.value = true;
    const profileId = persistConnection();
    await pushProfileRoute(profileId, activeSection.value);
  } catch (error) {
    isAuthorized.value = false;
    lastError.value = error instanceof Error ? error.message : String(error);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(activeProfileStorageKey);
    }
  } finally {
    isConnecting.value = false;
  }
}

function logout() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(activeProfileStorageKey);
  }

  stopHealthProbe();
  isAuthorized.value = false;
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

function saveProfileFromForm() {
  connectionForm.remember = true;
  persistConnection();
}

function deleteProfile(profileId: string) {
  if (profileId === newProfileId) {
    return;
  }

  profiles.value = profiles.value.filter((profile) => profile.id !== profileId);
  saveProfiles();

  if (
    typeof localStorage !== "undefined" &&
    localStorage.getItem(activeProfileStorageKey) === profileId
  ) {
    localStorage.removeItem(activeProfileStorageKey);
  }

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
  inviteDialogOpen.value = true;
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

function isExpired(value?: string) {
  return Boolean(value && Date.parse(value) < Date.now());
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
  return userLabel(node.user);
}

function userDeviceCount(user: HeadscaleUser) {
  return snapshot.value.nodes.filter((node) => node.user?.id === user.id).length;
}

function userRole(user: HeadscaleUser) {
  if (user.provider === "system" || user.name.includes("tagged")) {
    return "Service account";
  }
  if (user.id === "1") {
    return "Owner";
  }
  return "Member";
}

function userLabel(user?: HeadscaleUser) {
  if (isTagManagedDeviceUser(user)) {
    return copy.value.tagManagedDevices;
  }

  return user?.displayName || user?.name || user?.email || "Unknown";
}

function isTagManagedDeviceUser(user?: HeadscaleUser) {
  return user?.name === "tagged-devices";
}

function nodePendingRoutes(node: HeadscaleNode) {
  return node.availableRoutes.filter((route) => !node.approvedRoutes.includes(route));
}

function jumpToMachine(node: HeadscaleNode) {
  deviceSearch.value = node.givenName || node.name;
  machineFilter.value = "all";
  selectSection("devices");
}

function jumpToUser(user?: HeadscaleUser) {
  if (!user) {
    return;
  }

  userSearch.value = user.email || userLabel(user);
  userFilter.value = "all";
  selectSection("members");
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
  if (isExpired(node.expiry)) {
    return copy.value.expiredOnly;
  }
  return node.online ? t("online") : t("offline");
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
      provider: user.provider,
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

function prepareDeviceInvite(task: AddDeviceTask) {
  deviceSetupTask.value = task;
  inviteForm.reusable = task === "server";
  inviteForm.ephemeral = task === "client";
  inviteForm.aclTags = task === "server" ? "tag:server" : "";
  setAuthKeyExpiryDays(7);
  lastCreatedInvite.value = "";
  selectSection("devices");
}

function backToMachines() {
  deviceSetupTask.value = null;
  lastCreatedInvite.value = "";
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
}

function removePolicyTagOwner(id: string) {
  policyTagOwners.value = policyTagOwners.value.filter((tagOwner) => tagOwner.id !== id);
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
  memberDialogOpen.value = false;
}

async function deleteMember(user: HeadscaleUser) {
  await mutate((client) => client.deleteUser({ id: user.id }));
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
    await refreshSnapshot();
    inviteDialogOpen.value = false;
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isCreatingInvite.value = false;
  }
}

async function expireInvite(key: PreAuthKey) {
  await mutate((client) => client.expirePreAuthKey({ id: key.id }));
}

async function deleteInvite(key: PreAuthKey) {
  await mutate((client) => client.deletePreAuthKey({ id: key.id }));
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
    selectedRenameNode.value = null;
  }
}

function handleExpireDialogOpen(open: boolean) {
  expireDialogOpen.value = open;
  if (!open) {
    selectedExpireNode.value = null;
  }
}

function handleRemoveDialogOpen(open: boolean) {
  removeDialogOpen.value = open;
  if (!open) {
    selectedRemoveNode.value = null;
  }
}

function handleRouteApprovalDialogOpen(open: boolean) {
  routeApprovalDialogOpen.value = open;
  if (!open) {
    selectedRouteApproval.value = null;
  }
}

function openRenameDialog(node: HeadscaleNode) {
  selectedRenameNode.value = node;
  renameDrafts[node.id] = renameDrafts[node.id] || node.givenName || node.name;
  renameDialogOpen.value = true;
}

function openExpireDialog(node: HeadscaleNode) {
  selectedExpireNode.value = node;
  expireDialogOpen.value = true;
}

function openRemoveDialog(node: HeadscaleNode) {
  selectedRemoveNode.value = node;
  removeDialogOpen.value = true;
}

function openRouteApprovalDialog(node: HeadscaleNode, route: string) {
  selectedRouteApproval.value = { node, route };
  routeApprovalDialogOpen.value = true;
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
      <div class="flex items-center gap-3 text-sm text-muted-foreground">
        <HeadscaleLogo class="h-8 w-8" />
      </div>
    </section>

    <section v-else-if="!isAuthorized" class="mx-auto flex min-h-screen max-w-3xl items-start px-3 py-4 sm:px-4 sm:py-10">
      <Card class="w-full p-4 sm:p-6">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <HeadscaleLogo class="mb-3 h-11 w-11" />
            <h1 class="text-2xl font-semibold">{{ t("connectTitle") }}</h1>
            <p class="mt-2 text-sm text-muted-foreground">{{ t("connectSubtitle") }}</p>
          </div>
          <div class="grid w-full grid-cols-2 gap-2 sm:w-40 sm:shrink-0 sm:grid-cols-1">
            <Label for="login-locale-select" class="sr-only">{{ t("language") }}</Label>
            <NativeSelect
              id="login-locale-select"
              :model-value="locale"
              data-testid="locale-select"
              :aria-label="`${t('language')}: ${LOCALE_META[locale].nativeLabel}`"
              @update:model-value="changeLocale"
            >
              <NativeSelectOption v-for="option in SUPPORTED_LOCALES" :key="option" :value="option">
                {{ LOCALE_META[option].nativeLabel }}
              </NativeSelectOption>
            </NativeSelect>
            <Label for="login-theme-select" class="sr-only">{{ t("theme") }}</Label>
            <NativeSelect
              id="login-theme-select"
              :model-value="colorMode"
              data-testid="theme-select"
              :aria-label="`${t('theme')}: ${themeLabel}`"
              @update:model-value="changeTheme"
            >
              <NativeSelectOption v-for="mode in themeModes" :key="mode" :value="mode">
                {{ themeModeLabel(mode) }}
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <form class="grid gap-4" data-testid="connect-form" @submit.prevent="connect">
          <div>
            <Label for="connect-profile">{{ t("profile") }}</Label>
            <div class="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <NativeSelect
                id="connect-profile"
                :model-value="connectionForm.profileId"
                data-testid="connect-profile"
                @update:model-value="loadProfile"
              >
                <NativeSelectOption :value="newProfileId">{{ t("newProfile") }}</NativeSelectOption>
                <NativeSelectOption v-for="profile in profiles" :key="profile.id" :value="profile.id">
                  {{ profile.name }}
                </NativeSelectOption>
              </NativeSelect>
              <Button
                variant="outline"
                size="icon"
                type="button"
                data-testid="delete-profile"
                :disabled="connectionForm.profileId === newProfileId"
                :aria-label="t('deleteProfile')"
                @click="deleteProfile(connectionForm.profileId)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div>
            <Label for="connect-profile-name">{{ t("profileName") }}</Label>
            <Input
              id="connect-profile-name"
              v-model="connectionForm.profileName"
              data-testid="connect-profile-name"
              class="mt-2"
            />
          </div>

          <div>
            <Label for="connect-mode">{{ t("mode") }}</Label>
            <NativeSelect id="connect-mode" v-model="connectionForm.mode" data-testid="connect-mode" class="mt-2">
              <NativeSelectOption value="mock">{{ t("mockMode") }}</NativeSelectOption>
              <NativeSelectOption value="real">{{ t("realMode") }}</NativeSelectOption>
            </NativeSelect>
          </div>

          <div>
            <Label for="connect-server-url">{{ t("serverUrl") }}</Label>
            <Input
              id="connect-server-url"
              v-model="connectionForm.baseUrl"
              data-testid="connect-server-url"
              class="mt-2"
            />
          </div>

          <div>
            <Label for="connect-api-key">{{ t("apiKey") }}</Label>
            <Input
              id="connect-api-key"
              v-model="connectionForm.apiKey"
              data-testid="connect-api-key"
              type="password"
              class="mt-2"
              :placeholder="t('apiKeyPlaceholder')"
            />
          </div>

          <div class="flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Checkbox id="connect-remember" v-model="connectionForm.remember" data-testid="connect-remember" />
            <Label for="connect-remember">{{ t("rememberConnection") }}</Label>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" data-testid="save-profile" @click="saveProfileFromForm">
              <Check class="h-4 w-4" aria-hidden="true" />
              {{ t("saveProfile") }}
            </Button>
            <Button type="submit" data-testid="connect-submit" :disabled="isConnecting">
              <ShieldCheck class="h-4 w-4" aria-hidden="true" />
              {{ isConnecting ? t("running") : t("connect") }}
            </Button>
          </div>

          <p
            v-if="lastError"
            data-testid="connect-error"
            role="alert"
            class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {{ lastError }}
          </p>
        </form>

        <div v-if="profiles.length" class="mt-6 border-t pt-5">
          <h2 class="text-sm font-semibold uppercase text-muted-foreground">{{ t("savedProfiles") }}</h2>
          <div class="mt-3 grid gap-2">
            <div
              v-for="profile in profiles"
              :key="profile.id"
              class="grid gap-2 rounded-md border px-3 py-2 sm:grid-cols-[1fr_auto_auto]"
              :data-testid="`profile-row-${profile.name}`"
            >
              <Button
                type="button"
                variant="ghost"
                class="h-auto w-full justify-start px-0 py-0 text-start hover:bg-transparent"
                @click="loadProfile(profile.id)"
              >
                <span>
                  <span class="block text-sm font-medium">{{ profile.name }}</span>
                  <span class="block break-all text-xs text-muted-foreground">{{ profile.baseUrl }} · {{ profile.mode }}</span>
                </span>
              </Button>
              <Button type="button" variant="outline" size="sm" :data-testid="`use-profile-${profile.name}`" class="w-full sm:w-auto" @click="loadProfile(profile.id)">
                {{ t("useProfile") }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                :data-testid="`delete-profile-${profile.name}`"
                :aria-label="t('deleteProfile')"
                @click="deleteProfile(profile.id)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
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
                      <Sun v-if="colorMode === 'light'" class="h-4 w-4" aria-hidden="true" />
                      <Moon v-else-if="colorMode === 'dark'" class="h-4 w-4" aria-hidden="true" />
                      <Monitor v-else class="h-4 w-4" aria-hidden="true" />
                      <span>{{ t("theme") }}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent class="w-44" :side-offset="-16">
                      <DropdownMenuItem
                        v-for="mode in themeModes"
                        :key="mode"
                        :data-testid="`theme-option-${mode}`"
                        @click="chooseTheme(mode)"
                      >
                        <span>{{ themeModeLabel(mode) }}</span>
                        <Check v-if="colorMode === mode" class="ms-auto h-4 w-4" aria-hidden="true" />
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
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
          @update:open="inviteDialogOpen = $event"
          @submit="createInvite"
        />

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
              <p class="mt-1 text-2xl font-semibold">{{ snapshot.users.length }}</p>
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
                    <p class="text-sm text-muted-foreground">{{ nodeOwner(node) }}</p>
                  </div>
                  <Badge :variant="node.online ? 'secondary' : 'outline'">
                    <Wifi v-if="node.online" class="h-3 w-3" aria-hidden="true" />
                    <WifiOff v-else class="h-3 w-3" aria-hidden="true" />
                    {{ node.online ? t("online") : t("offline") }}
                  </Badge>
                </div>
                <p class="mt-3 break-all text-xs text-muted-foreground">{{ node.ipAddresses.join(", ") }}</p>
              </Card>
            </div>
          </div>
        </section>

        <section v-else-if="activeSection === 'devices'" class="space-y-3 sm:space-y-4">
          <div v-if="deviceSetupTask" class="grid max-w-3xl gap-4" data-testid="device-setup-flow">
            <button
              type="button"
              class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              data-testid="back-to-machines"
              @click="backToMachines"
            >
              <ArrowLeft class="h-4 w-4" aria-hidden="true" />
              {{ copy.backToMachines }}
            </button>

            <div class="grid gap-1">
              <h1 class="text-2xl font-semibold">{{ deviceSetupTitle }}</h1>
              <p class="text-sm text-muted-foreground">{{ copy.deviceSetupLead }}</p>
              <p class="text-sm text-muted-foreground">{{ deviceSetupDescription }}</p>
            </div>

            <div class="grid gap-7 pt-1">
              <section class="grid gap-3" data-testid="setup-device-step">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-semibold text-muted-foreground">1.</span>
                  <h2 class="text-lg font-semibold">{{ copy.setupDevice }}</h2>
                </div>
                <div class="grid gap-4 border-b pb-5">
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
                      @click="selectSection('access')"
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

              <section class="grid gap-3" data-testid="setup-auth-key-step">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-semibold text-muted-foreground">2.</span>
                  <h2 class="text-lg font-semibold">{{ copy.setupAuthKey }}</h2>
                </div>
                <div class="grid gap-4 border-b pb-5">
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
                        <button type="button" class="h-9 border-l px-3 text-sm" data-testid="setup-expiration-decrement" @click="setAuthKeyExpiryDays(authKeyExpiryDays - 1)">
                          -
                        </button>
                        <button type="button" class="h-9 border-l px-3 text-sm" data-testid="setup-expiration-increment" @click="setAuthKeyExpiryDays(authKeyExpiryDays + 1)">
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

              <section class="grid gap-3" data-testid="setup-generate-step">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-semibold text-muted-foreground">3.</span>
                  <h2 class="text-lg font-semibold">{{ copy.generateInstallScript }}</h2>
                </div>
                <div class="grid gap-3">
                  <Button class="w-fit" data-testid="generate-install-script" @click="openInviteDialog">
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

          <div v-else class="grid gap-3" data-testid="machines-workbench">
            <div class="grid gap-2 sm:flex sm:items-start sm:justify-between sm:gap-3">
              <div>
                <h1 class="text-xl font-semibold">{{ copy.devicesTitle }}</h1>
                <p class="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {{ copy.devicesSubtitle }}
                  <a
                    href="https://tailscale.com/kb/1017/install"
                    class="font-medium text-primary underline underline-offset-4"
                    data-testid="install-docs-link"
                  >
                    {{ copy.learnMore }}
                  </a>
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button size="sm" class="w-fit" data-testid="add-device-toggle">
                    <Plus class="h-4 w-4" aria-hidden="true" />
                    {{ copy.addDevice }}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-72 p-2" data-testid="add-device-menu">
                  <DropdownMenuItem class="items-start gap-3 p-3" data-testid="add-linux-device" @click="prepareDeviceInvite('server')">
                    <Server class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      <span class="block font-medium">{{ copy.linuxServer }}</span>
                      <span class="block text-xs leading-5 text-muted-foreground">{{ copy.linuxServerDescription }}</span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem class="items-start gap-3 p-3" data-testid="add-client-device" @click="prepareDeviceInvite('client')">
                    <Network class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      <span class="block font-medium">{{ copy.clientDevice }}</span>
                      <span class="block text-xs leading-5 text-muted-foreground">{{ copy.clientDeviceDescription }}</span>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Card v-if="snapshot.nodes.length === 0" class="relative overflow-hidden bg-accent/35 p-5 sm:p-8" data-testid="machines-empty">
              <div class="relative z-10 max-w-md">
                <h2 class="text-lg font-semibold">{{ copy.addFirstDevice }}</h2>
                <p class="mt-2 text-sm text-muted-foreground">{{ copy.addFirstDeviceDescription }}</p>
                <Button class="mt-4" @click="prepareDeviceInvite('client')">
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

            <div v-else class="space-y-2" data-testid="machine-table-shell">
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
              <Card class="min-w-0 overflow-hidden" data-testid="machine-list">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{{ copy.devicesTableMachine }}</TableHead>
                      <TableHead>{{ copy.devicesTableUser }}</TableHead>
                      <TableHead>{{ copy.devicesTableRoutes }}</TableHead>
                      <TableHead>{{ copy.devicesTableActivity }}</TableHead>
                      <TableHead class="hidden text-end md:table-cell">{{ copy.actions }}</TableHead>
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
                          <h2 class="truncate font-medium">{{ node.name }}</h2>
                        </div>
                        <p class="mt-1 break-all text-xs text-muted-foreground">{{ node.ipAddresses.join(", ") }}</p>
                        <div class="mt-2 flex flex-wrap gap-1">
                          <Badge v-if="node.tags.length === 0" variant="outline">{{ copy.noTags }}</Badge>
                          <Badge v-for="tag in node.tags" :key="tag" variant="outline">{{ tag }}</Badge>
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
                              <DropdownMenuItem :data-testid="`rename-node-action-mobile-${node.id}`" @click="openRenameDialog(node)">
                                <Pencil class="h-4 w-4" aria-hidden="true" />
                                {{ copy.rename }}
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
                        <p>{{ nodeOwner(node) }}</p>
                        <p class="text-xs text-muted-foreground">{{ node.user?.email || node.user?.name || copy.unknown }}</p>
                      </TableCell>
                      <TableCell class="align-top md:min-w-56">
                        <button
                          v-if="nodePendingRoutes(node).length"
                          type="button"
                          class="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          :data-testid="`device-pending-routes-${node.id}`"
                          @click="jumpToRoutesForMachine(node)"
                        >
                          <Badge variant="destructive" class="cursor-pointer hover:opacity-90">
                            {{ nodePendingRoutes(node).length }} {{ copy.pendingRoutes }}
                          </Badge>
                        </button>
                        <p v-else class="text-muted-foreground">{{ copy.noPendingRoutes }}</p>
                        <div class="mt-2 flex flex-wrap gap-1">
                          <Badge v-for="route in node.approvedRoutes" :key="route" variant="secondary">{{ route }}</Badge>
                        </div>
                      </TableCell>
                      <TableCell class="align-top md:min-w-44">
                        <Badge :variant="node.online ? 'secondary' : 'outline'">
                          <Wifi v-if="node.online" class="h-3 w-3" aria-hidden="true" />
                          <WifiOff v-else class="h-3 w-3" aria-hidden="true" />
                          {{ nodeStatusLabel(node) }}
                        </Badge>
                        <p class="mt-2 text-xs text-muted-foreground">{{ copy.lastSeen }}: {{ formatDate(node.lastSeen) }}</p>
                        <p class="text-xs text-muted-foreground">{{ copy.expires }}: {{ formatDate(node.expiry) }}</p>
                      </TableCell>
                      <TableCell class="hidden align-top md:table-cell md:min-w-16">
                        <div class="flex justify-end">
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
                              <DropdownMenuItem :data-testid="`rename-node-action-${node.id}`" @click="openRenameDialog(node)">
                                <Pencil class="h-4 w-4" aria-hidden="true" />
                                {{ copy.rename }}
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
                      <TableCell colspan="5" class="py-6 text-center text-sm text-muted-foreground">
                        {{ copy.noDevices }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>

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
        </section>

        <section v-else-if="activeSection === 'members'" class="space-y-3 lg:space-y-4">
          <div>
            <h1 class="text-2xl font-semibold">{{ copy.membersTitle }}</h1>
            <p class="mt-1 text-sm text-muted-foreground">{{ copy.membersSubtitle }}</p>
          </div>

          <Dialog :open="memberDialogOpen" @update:open="memberDialogOpen = $event">
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
                  <Button type="button" variant="outline" data-testid="cancel-create-member" @click="memberDialogOpen = false">
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
              <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">{{ filteredUsers.length }} / {{ snapshot.users.length }}</p>
              <Button type="button" variant="outline" size="icon" data-testid="export-users" :aria-label="copy.exportData" @click="exportUsers">
                <Download class="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button data-testid="open-create-member" @click="memberDialogOpen = true">
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
                    <TableHead>{{ copy.deviceCount }}</TableHead>
                    <TableHead>{{ copy.joined }}</TableHead>
                    <TableHead>{{ copy.authSource }}</TableHead>
                    <TableHead class="hidden text-end md:table-cell">{{ copy.actions }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="user in filteredUsers" :key="user.id" :data-testid="`member-${user.name}`">
                    <TableCell class="align-top md:min-w-56">
                      <p class="font-medium">{{ userLabel(user) }}</p>
                      <p class="mt-1 break-all text-sm text-muted-foreground">{{ user.email || user.provider || copy.unknown }}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="mt-2 md:hidden"
                        :data-testid="`delete-member-mobile-${user.name}`"
                        :aria-label="copy.deleteMember"
                        @click="deleteMember(user)"
                      >
                        <Trash2 class="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                    <TableCell class="align-top md:min-w-32">
                      <Badge variant="outline">{{ userRole(user) }}</Badge>
                    </TableCell>
                    <TableCell class="align-top md:min-w-28">{{ userDeviceCount(user) }}</TableCell>
                    <TableCell class="align-top text-sm text-muted-foreground md:min-w-40">{{ formatDate(user.createdAt) }}</TableCell>
                    <TableCell class="align-top md:min-w-36">{{ user.provider || copy.unknown }}</TableCell>
                    <TableCell class="hidden align-top md:table-cell md:min-w-16">
                      <div class="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          :data-testid="`delete-member-${user.name}`"
                          :aria-label="copy.deleteMember"
                          @click="deleteMember(user)"
                        >
                          <Trash2 class="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="filteredUsers.length === 0">
                    <TableCell colspan="6" class="py-6 text-center text-sm text-muted-foreground">
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
                    <TableHead class="text-end">{{ copy.actions }}</TableHead>
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
                      {{ userLabel(key.user) }}
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
                      <div class="flex flex-wrap gap-1">
                        <Badge
                          v-for="(tag, tagIndex) in key.aclTags"
                          :key="tag"
                          variant="outline"
                          :class="keyTagClass(tag)"
                          :data-testid="`invite-tag-${key.id}-${tagIndex}`"
                        >
                          {{ tag }}
                        </Badge>
                        <span v-if="key.aclTags.length === 0" class="text-xs text-muted-foreground">{{ copy.noTags }}</span>
                      </div>
                    </TableCell>
                    <TableCell class="min-w-48">
                      <div class="flex justify-end gap-2">
                        <Button size="sm" variant="outline" :data-testid="`expire-invite-${key.id}`" @click="expireInvite(key)">{{ copy.expireInvite }}</Button>
                        <Button size="sm" variant="destructive" :data-testid="`delete-invite-${key.id}`" @click="deleteInvite(key)">{{ copy.deleteInvite }}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow v-if="filteredPreAuthKeys.length === 0">
                    <TableCell colspan="6" class="py-6 text-center text-sm text-muted-foreground">
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
                      v-if="node.user"
                      type="button"
                      class="mt-1 inline-flex max-w-full text-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      :data-testid="`route-user-link-${node.id}`"
                      :aria-label="`${copy.viewUser}: ${nodeOwner(node)}`"
                      @click="jumpToUser(node.user)"
                    >
                      <span class="truncate">{{ nodeOwner(node) }}</span>
                    </button>
                    <p v-else class="text-sm text-muted-foreground">{{ nodeOwner(node) }}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="text-muted-foreground hover:text-foreground"
                    :disabled="nodePendingRoutes(node).length === 0"
                    :data-testid="`approve-routes-${node.id}`"
                    @click="approveRoutes(node)"
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

                <TabsContent value="rules" class="mt-3 grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)] rtl:lg:grid-cols-[minmax(0,1fr)_24rem]">
                  <div class="grid gap-4 rtl:lg:order-2">
                    <div class="rounded-md border bg-secondary/20 p-3" data-testid="policy-rule-builder">
                      <div>
                        <h2 class="font-semibold">{{ copy.policyQuickStartTitle }}</h2>
                        <p class="mt-1 text-sm text-muted-foreground">
                          {{ copy.policyQuickStartDescription }}
                        </p>
                      </div>

                      <div class="mt-3 grid gap-3">
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
                      </div>

                      <div class="mt-3 grid gap-3 rounded-md border bg-background p-3">
                        <p class="text-sm" data-testid="policy-rule-preview">
                          <span class="block text-xs font-medium text-muted-foreground">
                            {{ copy.policySimplePreview }}
                          </span>
                          {{ policyRulePreview }}
                        </p>
                        <Button type="button" data-testid="add-policy-rule" @click="addPolicyRule">
                          <Plus class="h-4 w-4" aria-hidden="true" />
                          {{ copy.addRule }}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div class="grid content-start gap-2 rtl:lg:order-1">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <h2 class="font-semibold">{{ copy.existingRules }}</h2>
                      <p class="text-sm text-muted-foreground">{{ copy.policyWorkspaceSummary }}</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{{ copy.policyRulesTableRule }}</TableHead>
                          <TableHead>{{ copy.policyRulesTableSource }}</TableHead>
                          <TableHead>{{ copy.policyRulesTableDestination }}</TableHead>
                          <TableHead>{{ copy.policyRulesTableService }}</TableHead>
                          <TableHead>{{ copy.policyRulesTableRisk }}</TableHead>
                          <TableHead class="text-end">{{ copy.policyRulesTableActions }}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow v-if="policyRules.length === 0">
                          <TableCell colspan="6" class="py-6 text-center text-muted-foreground">
                            {{ copy.noPolicyRules }}
                          </TableCell>
                        </TableRow>
                        <TableRow
                          v-for="rule in policyRules"
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
                          <TableCell class="text-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              :data-testid="`remove-policy-rule-${rule.id}`"
                              @click="removePolicyRule(rule.id)"
                            >
                              {{ copy.removeItem }}
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="groups" class="mt-3 grid gap-3">
                  <div class="grid gap-3 lg:grid-cols-[24rem_minmax(0,1fr)] rtl:lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <div class="grid gap-3 rounded-md border bg-secondary/20 p-3 rtl:lg:order-2">
                      <h2 class="font-semibold">{{ copy.groups }}</h2>
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
                      <Button type="button" data-testid="add-policy-group" @click="addPolicyGroup">
                        <Plus class="h-4 w-4" aria-hidden="true" />
                        {{ copy.addGroup }}
                      </Button>
                    </div>

                    <div class="grid content-start gap-3 rtl:lg:order-1">
                      <p class="text-sm text-muted-foreground">{{ copy.groupMemberPicker }}</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{{ copy.groupName }}</TableHead>
                            <TableHead>{{ copy.groupMembers }}</TableHead>
                            <TableHead class="text-end">{{ copy.actions }}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow
                            v-for="group in policyGroups"
                            :key="group.id"
                            :data-testid="`policy-group-${group.id}`"
                          >
                            <TableCell class="font-medium">{{ group.name }}</TableCell>
                            <TableCell class="break-all text-muted-foreground">{{ group.members }}</TableCell>
                            <TableCell class="text-end">
                              <Button type="button" variant="ghost" size="sm" :data-testid="`remove-policy-group-${group.id}`" @click="removePolicyGroup(group.id)">
                                {{ copy.removeItem }}
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tags" class="mt-3 grid gap-3">
                  <div class="grid gap-3 lg:grid-cols-[24rem_minmax(0,1fr)] rtl:lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <div class="grid gap-3 rounded-md border bg-secondary/20 p-3 rtl:lg:order-2">
                      <h2 class="font-semibold">{{ copy.tagOwners }}</h2>
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
                      <Button type="button" data-testid="add-policy-tag-owner" @click="addPolicyTagOwner">
                        <Plus class="h-4 w-4" aria-hidden="true" />
                        {{ copy.addTagOwner }}
                      </Button>
                    </div>

                    <div class="grid content-start gap-3 rtl:lg:order-1">
                      <p class="text-sm text-muted-foreground">{{ copy.tagOwnerPicker }}</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{{ copy.tagName }}</TableHead>
                            <TableHead>{{ copy.ownersList }}</TableHead>
                            <TableHead class="text-end">{{ copy.actions }}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow
                            v-for="tagOwner in policyTagOwners"
                            :key="tagOwner.id"
                            :data-testid="`policy-tag-owner-${tagOwner.id}`"
                          >
                            <TableCell class="font-medium">{{ tagOwner.tag }}</TableCell>
                            <TableCell class="break-all text-muted-foreground">{{ tagOwner.owners }}</TableCell>
                            <TableCell class="text-end">
                              <Button type="button" variant="ghost" size="sm" :data-testid="`remove-policy-tag-owner-${tagOwner.id}`" @click="removePolicyTagOwner(tagOwner.id)">
                                {{ copy.removeItem }}
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
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
