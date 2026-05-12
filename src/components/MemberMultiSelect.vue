<script setup lang="ts" generic="T extends MemberOption">
import { Check, Plus, Search } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface MemberOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  groupOrder?: number;
}

const props = withDefaults(
  defineProps<{
    modelValue: readonly string[];
    options: readonly T[];
    triggerLabel: string;
    searchPlaceholder?: string;
    emptyText?: string;
    testid: string;
    single?: boolean;
    allowCreate?: boolean;
    createLabel?: string;
    disabled?: boolean;
  }>(),
  {
    searchPlaceholder: "Search…",
    emptyText: "No options",
    single: false,
    allowCreate: false,
    createLabel: "Create",
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [next: string[]];
  create: [value: string];
}>();

const open = ref(false);
const search = ref("");

watch(open, (next) => {
  if (!next) {
    search.value = "";
  }
});

const selectedSet = computed(() => new Set(props.modelValue));

const filteredOptions = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return props.options;
  return props.options.filter((opt) => {
    const label = opt.label.toLowerCase();
    const value = opt.value.toLowerCase();
    const description = (opt.description ?? "").toLowerCase();
    return label.includes(query) || value.includes(query) || description.includes(query);
  });
});

const groupedOptions = computed(() => {
  const buckets = new Map<string, { label: string; order: number; items: T[] }>();
  for (const opt of filteredOptions.value) {
    const groupKey = opt.group ?? "";
    const existing = buckets.get(groupKey);
    if (existing) {
      existing.items.push(opt);
    } else {
      buckets.set(groupKey, {
        label: groupKey,
        order: opt.groupOrder ?? 999,
        items: [opt],
      });
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.order - b.order);
});

const canCreate = computed(() => {
  if (!props.allowCreate) return false;
  const query = search.value.trim();
  if (!query) return false;
  return !props.options.some((opt) => opt.value === query || opt.label === query);
});

function isSelected(value: string): boolean {
  return selectedSet.value.has(value);
}

function toggle(value: string) {
  if (props.single) {
    emit("update:modelValue", isSelected(value) ? [] : [value]);
    open.value = false;
    return;
  }

  const next = new Set(selectedSet.value);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  emit("update:modelValue", Array.from(next));
}

function handleCreate() {
  const query = search.value.trim();
  if (!query) return;
  emit("create", query);
  search.value = "";
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :disabled="disabled"
        :data-testid="`${testid}-trigger`"
        class="gap-1.5"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />
        <span>{{ triggerLabel }}</span>
        <Badge
          v-if="modelValue.length > 0"
          variant="secondary"
          class="ms-1"
          :data-testid="`${testid}-count`"
        >
          {{ modelValue.length }}
        </Badge>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-[20rem] p-0"
      align="start"
      :data-testid="`${testid}-content`"
    >
      <div class="grid gap-2 p-2">
        <div class="relative">
          <Search
            class="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            v-model="search"
            class="ps-8"
            :placeholder="searchPlaceholder"
            :data-testid="`${testid}-search`"
            autocomplete="off"
          />
        </div>

        <div
          class="grid max-h-[16rem] gap-1 overflow-y-auto pe-1"
          :data-testid="`${testid}-list`"
        >
          <p
            v-if="filteredOptions.length === 0 && !canCreate"
            class="px-2 py-3 text-center text-sm text-muted-foreground"
            :data-testid="`${testid}-empty`"
          >
            {{ emptyText }}
          </p>

          <div v-for="bucket in groupedOptions" :key="bucket.label" class="grid gap-1">
            <p
              v-if="bucket.label"
              class="px-2 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {{ bucket.label }}
            </p>
            <button
              v-for="opt in bucket.items"
              :key="opt.value"
              type="button"
              class="flex items-start gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              :data-testid="`${testid}-option-${opt.value}`"
              @click="toggle(opt.value)"
            >
              <Checkbox
                v-if="!single"
                :model-value="isSelected(opt.value)"
                class="mt-0.5 pointer-events-none"
                tabindex="-1"
                :aria-label="opt.label"
              />
              <span class="grid gap-0.5 min-w-0 flex-1">
                <span class="font-medium break-all">{{ opt.label }}</span>
                <span
                  v-if="opt.description"
                  class="text-xs text-muted-foreground break-all"
                >
                  {{ opt.description }}
                </span>
              </span>
              <Check
                v-if="single && isSelected(opt.value)"
                class="h-4 w-4 text-primary mt-0.5"
                aria-hidden="true"
              />
            </button>
          </div>

          <button
            v-if="canCreate"
            type="button"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none border-t mt-1 pt-2"
            :data-testid="`${testid}-create`"
            @click="handleCreate"
          >
            <Plus class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span>{{ createLabel }} "{{ search.trim() }}"</span>
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
