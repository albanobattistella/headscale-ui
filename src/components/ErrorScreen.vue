<script setup lang="ts">
import { ref } from "vue";
import { clearAllSecureData } from "@/lib/secure-storage";

const props = defineProps<{ error: unknown; reloadPage?: () => void }>();

const resetting = ref(false);
const resetDone = ref(false);
const resetError = ref<string>("");

async function reset() {
  resetting.value = true;
  resetError.value = "";
  try {
    await clearAllSecureData();
    resetDone.value = true;
    setTimeout(reload, 600);
  } catch (err) {
    resetError.value = err instanceof Error ? err.message : String(err);
  } finally {
    resetting.value = false;
  }
}

function reload() {
  (props.reloadPage ?? (() => window.location.reload()))();
}

function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-background p-4 text-foreground"
    data-testid="error-screen"
  >
    <div class="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
      <h1 class="text-lg font-semibold">Headscale UI failed to start</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        The application could not load its local data. This is usually transient
        (private-mode storage, a corrupted browser profile, or an outdated cache).
      </p>
      <pre
        class="mt-4 max-h-32 overflow-auto rounded border bg-muted px-3 py-2 text-xs text-muted-foreground"
      >{{ describe(error) }}</pre>
      <div class="mt-4 flex flex-col gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
          data-testid="error-reload"
          :disabled="resetting"
          @click="reload"
        >
          Try again
        </button>
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          data-testid="error-reset"
          :disabled="resetting || resetDone"
          @click="reset"
        >
          {{ resetDone ? "Cleared, reloading…" : resetting ? "Clearing…" : "Reset application data" }}
        </button>
      </div>
      <p
        v-if="resetError"
        class="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        role="alert"
      >
        {{ resetError }}
      </p>
      <p class="mt-4 text-xs text-muted-foreground">
        Resetting will delete all saved server connections from this browser.
      </p>
    </div>
  </div>
</template>
