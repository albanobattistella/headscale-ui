<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "secondary" | "outline" | "destructive";
    class?: string;
  }>(),
  {
    variant: "default",
  },
);

const badgeClass = computed(() =>
  cn(
    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
    {
      "bg-primary text-primary-foreground": props.variant === "default",
      "bg-secondary text-secondary-foreground": props.variant === "secondary",
      "border border-input text-foreground": props.variant === "outline",
      "bg-destructive text-destructive-foreground": props.variant === "destructive",
    },
    props.class,
  ),
);
</script>

<template>
  <span :class="badgeClass">
    <slot />
  </span>
</template>
