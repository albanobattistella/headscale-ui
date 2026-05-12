<script setup lang="ts">
import { RouterView } from "vue-router";
import { useSessionRestore } from "@/composables/useSessionRestore";

useSessionRestore();
</script>

<template>
  <RouterView />
</template>
