<script setup lang="ts">
import { reactiveOmit } from "@vueuse/core";
import type { AlertDialogTitleProps } from "reka-ui";
import { AlertDialogTitle, useForwardProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<AlertDialogTitleProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = reactiveOmit(props, "class");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <AlertDialogTitle data-slot="alert-dialog-title" v-bind="forwardedProps" :class="cn('text-lg font-semibold', props.class)">
    <slot />
  </AlertDialogTitle>
</template>
