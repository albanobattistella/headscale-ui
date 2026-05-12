<script setup lang="ts">
import { Check, Pencil, Trash2, X } from "lucide-vue-next";
import { ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProductCopy } from "@/composables/useProductCopy";
import type { IpRule } from "@/domain/policy-views";

const props = defineProps<{
  rule: IpRule;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  "edit-start": [];
  "edit-cancel": [];
  update: [patch: { source: string; destination: string; ports: string }];
  remove: [];
}>();

const { copy } = useProductCopy();

const sourceDraft = ref(props.rule.source);
const destinationDraft = ref(props.rule.destination);
const portsDraft = ref(props.rule.ports);

watch(
  () => [props.isEditing, props.rule] as const,
  ([editing]) => {
    if (editing) {
      sourceDraft.value = props.rule.source;
      destinationDraft.value = props.rule.destination;
      portsDraft.value = props.rule.ports;
    }
  },
);

function commit() {
  const source = sourceDraft.value.trim();
  const destination = destinationDraft.value.trim();
  const ports = portsDraft.value.trim();
  if (!source || !destination || !ports) {
    emit("edit-cancel");
    return;
  }
  if (
    source === props.rule.source &&
    destination === props.rule.destination &&
    ports === props.rule.ports
  ) {
    emit("edit-cancel");
    return;
  }
  emit("update", { source, destination, ports });
}
</script>

<template>
  <div
    v-if="!isEditing"
    class="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
    :data-testid="`ip-rule-${rule.ruleId}`"
  >
    <p class="break-all min-w-0">
      <span class="font-medium">{{ rule.source }}</span>
      <span class="text-muted-foreground"> &rarr; </span>
      <span class="break-all">{{ rule.destination }}</span>
      <span class="text-muted-foreground"> &middot; {{ rule.ports }}</span>
    </p>
    <div class="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        :aria-label="copy.editIpRule"
        :data-testid="`ip-rule-edit-${rule.ruleId}`"
        @click="emit('edit-start')"
      >
        <Pencil class="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        :aria-label="copy.removeRule"
        :data-testid="`ip-rule-remove-${rule.ruleId}`"
        @click="emit('remove')"
      >
        <Trash2 class="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  </div>
  <div
    v-else
    class="grid gap-2 rounded-md border bg-muted/30 px-3 py-2"
    :data-testid="`ip-rule-edit-form-${rule.ruleId}`"
  >
    <div
      class="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_minmax(6rem,1fr)]"
    >
      <Input
        v-model="sourceDraft"
        class="font-mono text-xs"
        :placeholder="copy.ipRuleSourcePlaceholder"
        :data-testid="`ip-rule-source-${rule.ruleId}`"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="emit('edit-cancel')"
      />
      <span class="text-muted-foreground text-sm text-center hidden sm:block">&rarr;</span>
      <Input
        v-model="destinationDraft"
        class="font-mono text-xs"
        :placeholder="copy.ipRuleDestinationPlaceholder"
        :data-testid="`ip-rule-destination-${rule.ruleId}`"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="emit('edit-cancel')"
      />
      <span class="text-muted-foreground text-sm text-center hidden sm:block">&middot;</span>
      <Input
        v-model="portsDraft"
        class="font-mono text-xs"
        :placeholder="copy.ipRulePortsPlaceholder"
        :data-testid="`ip-rule-ports-${rule.ruleId}`"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="emit('edit-cancel')"
      />
    </div>
    <div class="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        :aria-label="copy.cancelIpRuleEdit"
        :data-testid="`ip-rule-cancel-${rule.ruleId}`"
        @click="emit('edit-cancel')"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        size="sm"
        :aria-label="copy.saveIpRule"
        :data-testid="`ip-rule-save-${rule.ruleId}`"
        @click="commit"
      >
        <Check class="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  </div>
</template>
