<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "secondary" | "ghost" | "outline" | "destructive";
    size?: "sm" | "default" | "icon";
    class?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  }>(),
  {
    variant: "default",
    size: "default",
    type: "button",
    disabled: false,
  },
);

const buttonClass = computed(() =>
  cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    {
      "bg-primary text-primary-foreground hover:bg-primary/90": props.variant === "default",
      "bg-secondary text-secondary-foreground hover:bg-secondary/80": props.variant === "secondary",
      "hover:bg-accent hover:text-accent-foreground": props.variant === "ghost",
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground":
        props.variant === "outline",
      "bg-destructive text-destructive-foreground hover:bg-destructive/90":
        props.variant === "destructive",
      "h-8 px-2.5": props.size === "sm",
      "h-9 px-3 py-2": props.size === "default",
      "h-9 w-9": props.size === "icon",
    },
    props.class,
  ),
);
</script>

<template>
  <button :type="type" :disabled="disabled" :class="buttonClass">
    <slot />
  </button>
</template>
