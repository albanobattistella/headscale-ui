<script setup lang="ts">
import { reactiveOmit } from "@vueuse/core";
import type { AlertDialogCancelProps } from "reka-ui";
import { AlertDialogCancel, useForwardProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<AlertDialogCancelProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <AlertDialogCancel
    v-bind="forwardedProps"
    :class="
      cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </AlertDialogCancel>
</template>
