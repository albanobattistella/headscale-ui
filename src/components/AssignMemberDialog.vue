<script setup lang="ts">
import { LoaderCircle } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AssignMemberOption {
  id: string;
  name: string;
  assigned: boolean;
  hint?: string;
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description: string;
    options: readonly AssignMemberOption[];
    applyLabel: string;
    cancelLabel: string;
    emptyLabel: string;
    testidPrefix: string;
    assignedLabel: string;
    isSubmitting?: boolean;
    error?: string;
  }>(),
  {
    isSubmitting: false,
    error: "",
  },
);

const emit = defineEmits<{
  "update:open": [open: boolean];
  apply: [selection: string[]];
}>();

const selected = ref<Set<string>>(new Set());

watch(
  () => [props.open, props.options],
  () => {
    if (props.open) {
      selected.value = new Set(props.options.filter((o) => o.assigned).map((o) => o.id));
    }
  },
  { immediate: true },
);

const sortedOptions = computed(() =>
  [...props.options].sort((a, b) => a.name.localeCompare(b.name)),
);
const selectedCount = computed(() => selected.value.size);
const initialCount = computed(() => props.options.filter((o) => o.assigned).length);

const dirty = computed(() => {
  if (selectedCount.value !== initialCount.value) return true;
  for (const option of props.options) {
    const isSelected = selected.value.has(option.id);
    if (option.assigned !== isSelected) return true;
  }
  return false;
});

function toggle(option: AssignMemberOption) {
  if (props.isSubmitting) return;
  const next = new Set(selected.value);
  if (next.has(option.id)) {
    next.delete(option.id);
  } else {
    next.add(option.id);
  }
  selected.value = next;
}

function submit() {
  emit("apply", Array.from(selected.value));
}

function closeDialog() {
  emit("update:open", false);
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg" :data-testid="`${testidPrefix}-dialog`">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <form class="grid gap-3" :data-testid="`${testidPrefix}-form`" @submit.prevent="submit">
        <div
          v-if="sortedOptions.length === 0"
          class="rounded-md border bg-background px-3 py-6 text-center text-sm text-muted-foreground"
          :data-testid="`${testidPrefix}-empty`"
        >
          {{ emptyLabel }}
        </div>
        <div v-else class="grid max-h-[50vh] gap-1 overflow-y-auto pe-1">
          <button
            v-for="option in sortedOptions"
            :key="option.id"
            type="button"
            class="flex items-start gap-3 rounded-md border bg-background px-3 py-2 text-start hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="{ 'opacity-60': isSubmitting }"
            :disabled="isSubmitting"
            :data-testid="`${testidPrefix}-option-${option.id}`"
            @click="toggle(option)"
          >
            <Checkbox
              class="mt-0.5"
              :model-value="selected.has(option.id)"
              :disabled="isSubmitting"
              tabindex="-1"
              :aria-label="option.name"
              @click.stop="toggle(option)"
            />
            <div class="grid gap-1 text-sm">
              <span class="font-medium break-all">{{ option.name }}</span>
              <span v-if="option.hint" class="text-xs text-muted-foreground break-all">
                {{ option.hint }}
              </span>
            </div>
            <Badge
              v-if="option.assigned"
              variant="secondary"
              class="ms-auto self-start text-xs font-normal"
              :data-testid="`${testidPrefix}-assigned-${option.id}`"
            >
              {{ assignedLabel }}
            </Badge>
          </button>
        </div>
        <p
          v-if="error"
          role="alert"
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          :data-testid="`${testidPrefix}-error`"
        >
          {{ error }}
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            :data-testid="`${testidPrefix}-cancel`"
            :disabled="isSubmitting"
            @click="closeDialog"
          >
            {{ cancelLabel }}
          </Button>
          <Button
            type="submit"
            :data-testid="`${testidPrefix}-apply`"
            :disabled="isSubmitting || !dirty"
          >
            <LoaderCircle
              v-if="isSubmitting"
              class="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
            {{ applyLabel }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
