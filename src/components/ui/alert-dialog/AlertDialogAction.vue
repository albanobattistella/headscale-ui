<script setup lang="ts">
import { reactiveOmit } from "@vueuse/core";
import type { AlertDialogActionProps } from "reka-ui";
import { AlertDialogAction, useForwardProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<
  AlertDialogActionProps & {
    class?: HTMLAttributes["class"];
    variant?: "default" | "destructive";
  }
>();

const delegatedProps = reactiveOmit(props, "class", "variant");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <AlertDialogAction
    v-bind="forwardedProps"
    :data-variant="variant"
    :class="
      cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'destructive'
          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
        props.class,
      )
    "
  >
    <slot />
  </AlertDialogAction>
</template>
