<script setup lang="ts">
import { cn } from "@/lib/utils";

defineProps<{
  class?: string;
}>();
</script>

<template>
  <section :class="cn('rounded-md border bg-card text-card-foreground shadow-xs', $props.class)">
    <slot />
  </section>
</template>
