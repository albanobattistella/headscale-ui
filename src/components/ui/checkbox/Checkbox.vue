<script setup lang="ts">
import { cn } from "@/lib/utils";

defineOptions({
  inheritAttrs: false,
});

withDefaults(
  defineProps<{
    class?: string;
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
  <input
    v-bind="$attrs"
    type="checkbox"
    :checked="modelValue"
    :disabled="disabled"
    :class="
      cn(
        'h-5 w-5 cursor-pointer rounded-sm border border-input bg-background accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        $props.class
      )
    "
    @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
  />
</template>
