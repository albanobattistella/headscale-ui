<script setup lang="ts">
import { cn } from "@/lib/utils";

defineOptions({
  inheritAttrs: false,
});

withDefaults(
  defineProps<{
    class?: string;
    disabled?: boolean;
    modelValue?: string;
  }>(),
  {
    disabled: false,
    modelValue: "",
  },
);

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <select
    v-bind="$attrs"
    :value="modelValue"
    :disabled="disabled"
    :class="
      cn(
        'flex h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        $props.class
      )
    "
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <slot />
  </select>
</template>
