<script setup lang="ts">
import { FileCheck2, LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-vue-next";
import { computed } from "vue";
import type { HeadscaleClient } from "@/api/types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ActionFeedbackKey, useActionFeedback } from "@/composables/useActionFeedback";
import { useMutation } from "@/composables/useMutation";
import {
  type PolicyBuilderSlot,
  type PolicyChoice,
  type PolicyListChoice,
  usePolicyDesigner,
} from "@/composables/usePolicyDesigner";
import { useProductCopy } from "@/composables/useProductCopy";
import { useSnapshot } from "@/composables/useSnapshot";
import {
  findOrphanReferences,
  type PolicyGroup,
  type PolicyMemberRef,
  type PolicyRule,
  type PolicyTagOwner,
} from "@/domain/policy-designer";
import { useHeadscaleI18n } from "@/i18n";
import { toTraditionalChineseValue } from "@/i18n/traditional";
import { isExitRoute } from "@/utils/status-class";

const { locale, meta } = useHeadscaleI18n();
const { copy } = useProductCopy();
const { snapshot, routeNodes } = useSnapshot();
const { isActionPending, actionError } = useActionFeedback();
const {
  policyDraft,
  policyRules,
  policyGroups,
  policyTagOwners,
  policyExtraSectionKeys,
  activePolicyTab,
  policyRuleDialogOpen,
  policyGroupDialogOpen,
  policyTagOwnerDialogOpen,
  policyRemovalDialogOpen,
  pendingPolicyRemoval,
  policyRuleForm,
  policyGroupForm,
  policyTagOwnerForm,
  policyGroupMemberSelection,
  policyTagOwnerSelection,
  policyRuleSearch,
  policyGroupSearch,
  policyTagOwnerSearch,
  policyGroupEditing,
  policyTagOwnerEditing,
  policyDesignerState,
  policyPayload,
  filteredPolicyGroups,
  filteredPolicyTagOwners,
  addPolicyRule,
  addPolicyGroup,
  addPolicyTagOwner,
  removeRule,
  removeGroup,
  removeTagOwner,
  policyChoiceId,
  isPolicyRuleHighRisk,
  addUniqueMemberRef,
} = usePolicyDesigner();

const visibleUsers = computed(() =>
  snapshot.value.users.filter((user) => user.name !== "tagged-devices"),
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
  visibleUsers.value
    .filter((user) => user.email || user.name)
    .map((user) => ({
      id: policyChoiceId("source", user.email || user.name),
      label: userLabel(user.displayName || user.name || user.email),
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
        label: userLabel(user.displayName || user.name || user.email),
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

const knownUserPrincipals = computed(() => {
  const list: string[] = [];
  for (const user of snapshot.value.users) {
    if (user.email) list.push(user.email);
    if (user.name) list.push(user.name);
  }
  return list;
});

const policyOrphanReferences = computed(() =>
  findOrphanReferences(policyDesignerState.value, knownUserPrincipals.value),
);

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
  if (policyOrphanReferences.value.length > 0) {
    const dangling = policyOrphanReferences.value
      .map((ref) => `${ref.containerName} → ${ref.value}`)
      .join("; ");
    warnings.push(`${copy.value.orphanReferenceWarning} ${dangling}`);
  }

  return warnings;
});

const policyRiskCount = computed(() => policyWarnings.value.length);

const policyWorkspaceSummary = computed(() => {
  if (locale.value === "zh" || locale.value === "zh-Hant") {
    return localizeChineseText(
      `${policyRules.value.length} 条规则，${policyGroups.value.length} 个用户组，${policyTagOwners.value.length} 个标签授权，${policyRiskCount.value} 个风险。`,
    );
  }
  if (locale.value === "fr") {
    return `${policyRules.value.length} règles, ${policyGroups.value.length} groupes, ${policyTagOwners.value.length} accès aux tags et ${policyRiskCount.value} avertissements.`;
  }
  if (locale.value === "ru") {
    return `${policyRules.value.length} правил, ${policyGroups.value.length} групп, ${policyTagOwners.value.length} прав на теги и ${policyRiskCount.value} предупреждений.`;
  }
  if (locale.value === "es") {
    return `${policyRules.value.length} reglas, ${policyGroups.value.length} grupos, ${policyTagOwners.value.length} permisos de etiquetas y ${policyRiskCount.value} advertencias.`;
  }
  if (locale.value === "ar") {
    return `${policyRules.value.length} قاعدة، ${policyGroups.value.length} مجموعة، ${policyTagOwners.value.length} منح وسوم و ${policyRiskCount.value} تحذيرات.`;
  }
  return `${policyRules.value.length} rules, ${policyGroups.value.length} groups, ${policyTagOwners.value.length} tag grants and ${policyRiskCount.value} warnings.`;
});

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

function userLabel(value: string | undefined) {
  return value || copy.value.unknown;
}

function localizeChineseText(value: string) {
  return locale.value === "zh-Hant" ? toTraditionalChineseValue(value) : value;
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
    if (locale.value === "zh" || locale.value === "zh-Hant") {
      return localizeChineseText("高风险：所有来源可以访问所有设备的所有服务。");
    }
    if (locale.value === "fr") {
      return "Risque élevé : tout le monde peut atteindre chaque appareil sur chaque service.";
    }
    if (locale.value === "ru") {
      return "Высокий риск: все могут обращаться к каждому устройству через любой сервис.";
    }
    if (locale.value === "es") {
      return "Alto riesgo: todos pueden acceder a cada dispositivo en todos los servicios.";
    }
    if (locale.value === "ar") {
      return "مخاطرة عالية: يمكن للجميع الوصول إلى كل جهاز عبر كل الخدمات.";
    }
    return "High risk: everyone can reach every device on every service.";
  }

  if (locale.value === "zh" || locale.value === "zh-Hant") {
    return localizeChineseText(`允许 ${sourceLabel} 访问 ${destinationLabel} 的 ${serviceLabel}。`);
  }
  if (locale.value === "fr") {
    return `Autoriser ${sourceLabel} à atteindre ${destinationLabel} via ${serviceLabel}.`;
  }
  if (locale.value === "ru") {
    return `Разрешить ${sourceLabel} доступ к ${destinationLabel} через ${serviceLabel}.`;
  }
  if (locale.value === "es") {
    return `Permitir que ${sourceLabel} acceda a ${destinationLabel} mediante ${serviceLabel}.`;
  }
  if (locale.value === "ar") {
    return `السماح لـ ${sourceLabel} بالوصول إلى ${destinationLabel} عبر ${serviceLabel}.`;
  }
  return `Allow ${sourceLabel} to reach ${destinationLabel} on ${serviceLabel}.`;
}

function policyMemberDisplay(member: PolicyMemberRef) {
  return member.value;
}

function addSelectedPolicyGroupMember() {
  const value = policyGroupMemberSelection.value || policyMemberChoices.value[0]?.value || "";
  if (!value) {
    return;
  }
  policyGroupForm.members = addUniqueMemberRef(policyGroupForm.members, value);
  policyGroupMemberSelection.value = "";
}

function addSelectedPolicyTagOwner() {
  const value = policyTagOwnerSelection.value || policyOwnerChoices.value[0]?.value || "";
  if (!value) {
    return;
  }
  policyTagOwnerForm.owners = addUniqueMemberRef(policyTagOwnerForm.owners, value);
  policyTagOwnerSelection.value = "";
}

function removePolicyGroupFormMember(value: string) {
  policyGroupForm.members = policyGroupForm.members.filter((m) => m.value !== value);
}

function removePolicyTagOwnerFormOwner(value: string) {
  policyTagOwnerForm.owners = policyTagOwnerForm.owners.filter((o) => o.value !== value);
}

function changePolicyTab(nextTab: string) {
  if (["rules", "groups", "tags", "review"].includes(nextTab)) {
    activePolicyTab.value = nextTab as typeof activePolicyTab.value;
  }
}

function openPolicyRuleDialog() {
  policyRuleDialogOpen.value = true;
}

function handlePolicyRuleDialogOpen(open: boolean) {
  policyRuleDialogOpen.value = open;
}

function openPolicyGroupDialog() {
  policyGroupEditing.value = null;
  policyGroupForm.name = policyGroupNameChoices.value[0] ?? "group:ops";
  policyGroupForm.members = [];
  policyGroupMemberSelection.value = "";
  policyGroupDialogOpen.value = true;
}

function openPolicyGroupEditor(group: PolicyGroup) {
  policyGroupEditing.value = group;
  policyGroupForm.name = group.name;
  policyGroupForm.members = group.members.map((member) => ({ ...member }));
  policyGroupMemberSelection.value = "";
  policyGroupDialogOpen.value = true;
}

function handlePolicyGroupDialogOpen(open: boolean) {
  policyGroupDialogOpen.value = open;
  if (!open) {
    policyGroupEditing.value = null;
  }
}

function openPolicyTagOwnerDialog() {
  policyTagOwnerEditing.value = null;
  policyTagOwnerForm.tag = policyTagNameChoices.value[0] ?? "tag:server";
  policyTagOwnerForm.owners = [];
  policyTagOwnerSelection.value = "";
  policyTagOwnerDialogOpen.value = true;
}

function openPolicyTagOwnerEditor(tagOwner: PolicyTagOwner) {
  policyTagOwnerEditing.value = tagOwner;
  policyTagOwnerForm.tag = tagOwner.tag;
  policyTagOwnerForm.owners = tagOwner.owners.map((owner) => ({ ...owner }));
  policyTagOwnerSelection.value = "";
  policyTagOwnerDialogOpen.value = true;
}

function handlePolicyTagOwnerDialogOpen(open: boolean) {
  policyTagOwnerDialogOpen.value = open;
  if (!open) {
    policyTagOwnerEditing.value = null;
  }
}

function requestRemovePolicyRule(rule: PolicyRule) {
  pendingPolicyRemoval.value = {
    kind: "rule",
    id: rule.id,
    label: policyRuleSentence(rule.source, rule.destination, rule.ports),
  };
  policyRemovalDialogOpen.value = true;
}

function requestRemovePolicyGroup(group: PolicyGroup) {
  pendingPolicyRemoval.value = {
    kind: "group",
    id: group.id,
    label: group.name,
  };
  policyRemovalDialogOpen.value = true;
}

function requestRemovePolicyTagOwner(tagOwner: PolicyTagOwner) {
  pendingPolicyRemoval.value = {
    kind: "tagOwner",
    id: tagOwner.id,
    label: tagOwner.tag,
  };
  policyRemovalDialogOpen.value = true;
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
    removeRule(target.id);
  }
  if (target.kind === "group") {
    removeGroup(target.id);
  }
  if (target.kind === "tagOwner") {
    removeTagOwner(target.id);
  }
  pendingPolicyRemoval.value = null;
  policyRemovalDialogOpen.value = false;
}

const { mutate } = useMutation({ skipRefresh: true });

async function savePolicy() {
  const nextDraft = JSON.stringify(policyPayload.value, null, 2);
  policyDraft.value = nextDraft;
  await mutate("save-policy", (client) => client.setPolicy({ policy: nextDraft }));
}

function handlePolicyRuleSubmit(event: Event) {
  event.preventDefault();
  addPolicyRule();
}

function handlePolicyGroupSubmit(event: Event) {
  event.preventDefault();
  addPolicyGroup();
}

function handlePolicyTagOwnerSubmit(event: Event) {
  event.preventDefault();
  addPolicyTagOwner();
}
</script>

<template>
  <section class="space-y-3 sm:space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">{{ copy.accessTitle }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ copy.accessSubtitle }}</p>
      </div>
      <Button
        size="sm"
        data-testid="save-policy"
        :disabled="isActionPending('save-policy')"
        @click="savePolicy"
      >
        <LoaderCircle
          v-if="isActionPending('save-policy')"
          class="h-4 w-4 animate-spin"
          aria-hidden="true"
        />
        <FileCheck2 v-else class="h-4 w-4" aria-hidden="true" />
        {{ copy.savePolicy }}
      </Button>
    </div>
    <p
      v-if="actionError('save-policy')"
      role="alert"
      class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      data-testid="save-policy-error"
    >
      {{ actionError("save-policy") }}
    </p>

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
            <div
              class="flex flex-col gap-2 sm:flex-row sm:items-center"
              data-testid="policy-rules-toolbar"
            >
              <div class="w-full sm:max-w-sm">
                <Label for="policy-rule-search" class="sr-only">{{
                  copy.searchPolicyRules
                }}</Label>
                <div class="relative">
                  <Search
                    class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="policy-rule-search"
                    v-model="policyRuleSearch"
                    data-testid="policy-rule-search"
                    class="ps-8"
                    :placeholder="copy.searchPolicyRules"
                  />
                </div>
              </div>
              <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">
                {{ filteredPolicyRules.length }} / {{ policyRules.length }}
              </p>
              <Button
                type="button"
                data-testid="open-policy-rule-dialog"
                @click="openPolicyRuleDialog"
              >
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
                <form
                  class="grid gap-3"
                  data-testid="policy-rule-form"
                  @submit="handlePolicyRuleSubmit"
                >
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
                      <p class="font-medium">
                        {{ policyRuleSentence(rule.source, rule.destination, rule.ports) }}
                      </p>
                    </TableCell>
                    <TableCell class="break-all">{{
                      policyChoiceLabel("source", rule.source)
                    }}</TableCell>
                    <TableCell class="break-all">{{
                      policyChoiceLabel("destination", rule.destination)
                    }}</TableCell>
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
            <div
              class="flex flex-col gap-2 sm:flex-row sm:items-center"
              data-testid="policy-groups-toolbar"
            >
              <div class="w-full sm:max-w-sm">
                <Label for="policy-group-search" class="sr-only">{{
                  copy.searchPolicyGroups
                }}</Label>
                <div class="relative">
                  <Search
                    class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="policy-group-search"
                    v-model="policyGroupSearch"
                    data-testid="policy-group-search"
                    class="ps-8"
                    :placeholder="copy.searchPolicyGroups"
                  />
                </div>
              </div>
              <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">
                {{ filteredPolicyGroups.length }} / {{ policyGroups.length }}
              </p>
              <Button
                type="button"
                data-testid="open-policy-group-dialog"
                @click="openPolicyGroupDialog"
              >
                <Plus class="h-4 w-4" aria-hidden="true" />
                {{ copy.addGroup }}
              </Button>
            </div>

            <Dialog :open="policyGroupDialogOpen" @update:open="handlePolicyGroupDialogOpen">
              <DialogContent class="sm:max-w-xl" data-testid="policy-group-dialog">
                <DialogHeader>
                  <DialogTitle>
                    {{ policyGroupEditing ? copy.editPolicyGroup : copy.addGroup }}
                  </DialogTitle>
                  <DialogDescription>{{ copy.groupMemberPicker }}</DialogDescription>
                </DialogHeader>
                <form
                  class="grid gap-3"
                  data-testid="policy-group-form"
                  @submit="handlePolicyGroupSubmit"
                >
                  <div>
                    <Label for="policy-group-name">{{ copy.groupName }}</Label>
                    <NativeSelect
                      id="policy-group-name"
                      v-model="policyGroupForm.name"
                      data-testid="policy-group-name"
                      class="mt-2"
                    >
                      <NativeSelectOption
                        v-for="groupName in policyGroupNameChoices"
                        :key="groupName"
                        :value="groupName"
                      >
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
                        <NativeSelectOption value="" disabled>{{
                          copy.selectGroupMember
                        }}</NativeSelectOption>
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
                  <div
                    class="rounded-md border bg-background px-3 py-2"
                    data-testid="policy-group-members"
                  >
                    <p class="text-xs font-medium text-muted-foreground">
                      {{ copy.selectedMembers }}
                    </p>
                    <div v-if="policyGroupForm.members.length" class="mt-1 flex flex-wrap gap-1">
                      <Badge
                        v-for="member in policyGroupForm.members"
                        :key="member.value"
                        variant="secondary"
                        class="gap-1 pe-1"
                        :data-testid="`policy-group-form-member-${member.value}`"
                      >
                        <span class="break-all">{{ policyMemberDisplay(member) }}</span>
                        <button
                          type="button"
                          class="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          :aria-label="copy.removeItem"
                          :data-testid="`remove-policy-group-form-member-${member.value}`"
                          @click="removePolicyGroupFormMember(member.value)"
                        >
                          <Trash2 class="h-3 w-3" aria-hidden="true" />
                        </button>
                      </Badge>
                    </div>
                    <p v-else class="mt-1 min-h-6 break-all text-sm text-muted-foreground">
                      {{ copy.selectGroupMember }}
                    </p>
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="add-policy-group">
                      <Plus v-if="!policyGroupEditing" class="h-4 w-4" aria-hidden="true" />
                      <Pencil v-else class="h-4 w-4" aria-hidden="true" />
                      {{ policyGroupEditing ? copy.saveChanges : copy.addGroup }}
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
                    <TableCell class="text-muted-foreground">
                      <div v-if="group.members.length" class="flex flex-wrap gap-1">
                        <Badge
                          v-for="member in group.members"
                          :key="member.value"
                          variant="outline"
                          class="break-all"
                          :data-testid="`policy-group-${group.id}-member-${member.value}`"
                        >
                          {{ policyMemberDisplay(member) }}
                        </Badge>
                      </div>
                      <span v-else class="text-sm">{{ copy.noPolicyGroupMembers }}</span>
                    </TableCell>
                    <TableCell>
                      <div class="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          :data-testid="`edit-policy-group-${group.id}`"
                          @click="openPolicyGroupEditor(group)"
                        >
                          <Pencil class="h-4 w-4" aria-hidden="true" />
                          {{ copy.editItem }}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          :data-testid="`remove-policy-group-${group.id}`"
                          @click="requestRemovePolicyGroup(group)"
                        >
                          {{ copy.removeItem }}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="tags" class="mt-3 space-y-2">
            <div
              class="flex flex-col gap-2 sm:flex-row sm:items-center"
              data-testid="policy-tag-owners-toolbar"
            >
              <div class="w-full sm:max-w-sm">
                <Label for="policy-tag-owner-search" class="sr-only">{{
                  copy.searchPolicyTagOwners
                }}</Label>
                <div class="relative">
                  <Search
                    class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="policy-tag-owner-search"
                    v-model="policyTagOwnerSearch"
                    data-testid="policy-tag-owner-search"
                    class="ps-8"
                    :placeholder="copy.searchPolicyTagOwners"
                  />
                </div>
              </div>
              <p class="whitespace-nowrap text-xs text-muted-foreground sm:ms-auto">
                {{ filteredPolicyTagOwners.length }} / {{ policyTagOwners.length }}
              </p>
              <Button
                type="button"
                data-testid="open-policy-tag-owner-dialog"
                @click="openPolicyTagOwnerDialog"
              >
                <Plus class="h-4 w-4" aria-hidden="true" />
                {{ copy.addTagOwner }}
              </Button>
            </div>

            <Dialog
              :open="policyTagOwnerDialogOpen"
              @update:open="handlePolicyTagOwnerDialogOpen"
            >
              <DialogContent class="sm:max-w-xl" data-testid="policy-tag-owner-dialog">
                <DialogHeader>
                  <DialogTitle>
                    {{ policyTagOwnerEditing ? copy.editPolicyTagOwner : copy.addTagOwner }}
                  </DialogTitle>
                  <DialogDescription>{{ copy.tagOwnerPicker }}</DialogDescription>
                </DialogHeader>
                <form
                  class="grid gap-3"
                  data-testid="policy-tag-owner-form"
                  @submit="handlePolicyTagOwnerSubmit"
                >
                  <div>
                    <Label for="policy-tag-name">{{ copy.tagName }}</Label>
                    <NativeSelect
                      id="policy-tag-name"
                      v-model="policyTagOwnerForm.tag"
                      data-testid="policy-tag-name"
                      class="mt-2"
                    >
                      <NativeSelectOption
                        v-for="tagName in policyTagNameChoices"
                        :key="tagName"
                        :value="tagName"
                      >
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
                        <NativeSelectOption value="" disabled>{{
                          copy.selectTagOwner
                        }}</NativeSelectOption>
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
                  <div
                    class="rounded-md border bg-background px-3 py-2"
                    data-testid="policy-tag-owners"
                  >
                    <p class="text-xs font-medium text-muted-foreground">
                      {{ copy.selectedOwners }}
                    </p>
                    <div
                      v-if="policyTagOwnerForm.owners.length"
                      class="mt-1 flex flex-wrap gap-1"
                    >
                      <Badge
                        v-for="owner in policyTagOwnerForm.owners"
                        :key="owner.value"
                        variant="secondary"
                        class="gap-1 pe-1"
                        :data-testid="`policy-tag-owner-form-owner-${owner.value}`"
                      >
                        <span class="break-all">{{ policyMemberDisplay(owner) }}</span>
                        <button
                          type="button"
                          class="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          :aria-label="copy.removeItem"
                          :data-testid="`remove-policy-tag-owner-form-owner-${owner.value}`"
                          @click="removePolicyTagOwnerFormOwner(owner.value)"
                        >
                          <Trash2 class="h-3 w-3" aria-hidden="true" />
                        </button>
                      </Badge>
                    </div>
                    <p v-else class="mt-1 min-h-6 break-all text-sm text-muted-foreground">
                      {{ copy.selectTagOwner }}
                    </p>
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="add-policy-tag-owner">
                      <Plus v-if="!policyTagOwnerEditing" class="h-4 w-4" aria-hidden="true" />
                      <Pencil v-else class="h-4 w-4" aria-hidden="true" />
                      {{ policyTagOwnerEditing ? copy.saveChanges : copy.addTagOwner }}
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
                    <TableCell class="text-muted-foreground">
                      <div v-if="tagOwner.owners.length" class="flex flex-wrap gap-1">
                        <Badge
                          v-for="owner in tagOwner.owners"
                          :key="owner.value"
                          variant="outline"
                          class="break-all"
                          :data-testid="`policy-tag-owner-${tagOwner.id}-owner-${owner.value}`"
                        >
                          {{ policyMemberDisplay(owner) }}
                        </Badge>
                      </div>
                      <span v-else class="text-sm">{{ copy.noPolicyTagOwnerEntries }}</span>
                    </TableCell>
                    <TableCell>
                      <div class="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          :data-testid="`edit-policy-tag-owner-${tagOwner.id}`"
                          @click="openPolicyTagOwnerEditor(tagOwner)"
                        >
                          <Pencil class="h-4 w-4" aria-hidden="true" />
                          {{ copy.editItem }}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          :data-testid="`remove-policy-tag-owner-${tagOwner.id}`"
                          @click="requestRemovePolicyTagOwner(tagOwner)"
                        >
                          {{ copy.removeItem }}
                        </Button>
                      </div>
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
                <Badge v-for="section in policyExtraSectionKeys" :key="section" variant="outline">
                  {{ section }}
                </Badge>
                <p
                  v-if="policyExtraSectionKeys.length === 0"
                  class="text-sm text-muted-foreground"
                >
                  {{ copy.noPreservedPolicySections }}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>

    <AlertDialog
      :open="policyRemovalDialogOpen"
      @update:open="handlePolicyRemovalDialogOpen"
    >
      <AlertDialogContent data-testid="remove-policy-item-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ copy.confirmRemovePolicyItemTitle }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ copy.confirmRemovePolicyItemDescription }}
            <span
              v-if="pendingPolicyRemoval"
              class="mt-2 block break-all font-medium text-foreground"
            >
              {{ pendingPolicyRemoval.label }}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="cancel-remove-policy-item">{{
            copy.cancel
          }}</AlertDialogCancel>
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
      <Button
        data-testid="save-policy-sticky"
        class="shadow-lg"
        :disabled="isActionPending('save-policy')"
        @click="savePolicy"
      >
        <LoaderCircle
          v-if="isActionPending('save-policy')"
          class="h-4 w-4 animate-spin"
          aria-hidden="true"
        />
        <FileCheck2 v-else class="h-4 w-4" aria-hidden="true" />
        {{ copy.savePolicy }}
      </Button>
    </div>
  </section>
</template>
