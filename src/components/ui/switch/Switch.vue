<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

defineOptions({
  inheritAttrs: false,
});

withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    disabled?: boolean;
    modelValue?: boolean;
  }>(),
  {
    disabled: false,
    modelValue: false,
  },
);

defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<template>
  <label
    :class="
      cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center',
        disabled && 'cursor-not-allowed opacity-50',
        $props.class,
      )
    "
  >
    <input
      v-bind="$attrs"
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :disabled="disabled"
      class="peer sr-only"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span
      class="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
      aria-hidden="true"
    />
    <span
      class="pointer-events-none absolute start-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ltr:peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4"
      aria-hidden="true"
    />
  </label>
</template>
