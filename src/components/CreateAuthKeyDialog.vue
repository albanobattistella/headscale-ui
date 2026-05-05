<script setup lang="ts">
import { KeyRound } from "lucide-vue-next";
import { reactive, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useHeadscaleI18n } from "@/i18n";
import {
  type AuthKeyDialogDefaults,
  type AuthKeyDialogLabels,
  type AuthKeyDialogPayload,
  type AuthKeyDialogUserOption,
  dateTimeLocalToIso,
  isoToDateTimeLocal,
} from "./create-auth-key-dialog";

const props = withDefaults(
  defineProps<{
    open: boolean;
    users: readonly AuthKeyDialogUserOption[];
    defaults: AuthKeyDialogDefaults;
    labels: AuthKeyDialogLabels;
    isSubmitting?: boolean;
  }>(),
  {
    isSubmitting: false,
  },
);

const emit = defineEmits<{
  "update:open": [open: boolean];
  submit: [payload: AuthKeyDialogPayload];
}>();

const { locale } = useHeadscaleI18n();

const form = reactive({
  user: "",
  reusable: true,
  ephemeral: false,
  expirationLocal: "",
  aclTags: "",
});

function resolveUser(defaultUser: string) {
  if (props.users.some((user) => user.id === defaultUser)) {
    return defaultUser;
  }

  return props.users[0]?.id ?? defaultUser;
}

function resetForm() {
  form.user = resolveUser(props.defaults.user);
  form.reusable = props.defaults.reusable;
  form.ephemeral = props.defaults.ephemeral;
  form.expirationLocal = isoToDateTimeLocal(props.defaults.expiration);
  form.aclTags = props.defaults.aclTags;
}

function closeDialog() {
  emit("update:open", false);
}

function submitForm() {
  emit("submit", {
    user: form.user,
    reusable: form.reusable,
    ephemeral: form.ephemeral,
    expiration: dateTimeLocalToIso(form.expirationLocal),
    aclTags: form.aclTags,
  });
}

watch(
  () => [
    props.open,
    props.defaults.user,
    props.defaults.reusable,
    props.defaults.ephemeral,
    props.defaults.expiration,
    props.defaults.aclTags,
    props.users,
  ],
  () => {
    if (props.open) {
      resetForm();
    }
  },
  { immediate: true },
);
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent data-testid="invite-create-dialog" class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ labels.title }}</DialogTitle>
        <DialogDescription>
          {{ labels.description }}
        </DialogDescription>
      </DialogHeader>
      <form class="grid gap-3" data-testid="invite-form" @submit.prevent="submitForm">
        <div class="grid gap-3">
          <div>
            <Label for="invite-user">{{ labels.owner }}</Label>
            <NativeSelect id="invite-user" v-model="form.user" data-testid="invite-user" class="mt-2" :disabled="users.length === 0">
              <NativeSelectOption v-if="users.length === 0" value="">{{ labels.noUsers }}</NativeSelectOption>
              <NativeSelectOption v-for="user in users" :key="user.id" :value="user.id">{{ user.label }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div>
            <Label for="invite-expiration">{{ labels.expiration }}</Label>
            <DateTimePicker
              id="invite-expiration"
              v-model="form.expirationLocal"
              :locale="locale"
              data-testid="invite-expiration"
              class="mt-2"
              required
            />
          </div>
        </div>
        <div>
          <Label for="invite-tags">{{ labels.aclTags }}</Label>
          <Input id="invite-tags" v-model="form.aclTags" data-testid="invite-tags" class="mt-2" placeholder="tag:server" />
        </div>
        <div class="grid gap-2">
          <div class="flex min-h-9 items-center gap-2">
            <Checkbox id="invite-reusable" v-model="form.reusable" data-testid="invite-reusable" />
            <Label for="invite-reusable" class="font-normal">{{ labels.reusable }}</Label>
          </div>
          <div class="flex min-h-9 items-center gap-2">
            <Checkbox id="invite-ephemeral" v-model="form.ephemeral" data-testid="invite-ephemeral" />
            <Label for="invite-ephemeral" class="font-normal">{{ labels.ephemeral }}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" data-testid="cancel-create-invite" @click="closeDialog">{{ labels.cancel }}</Button>
          <Button type="submit" data-testid="create-invite" :disabled="isSubmitting || users.length === 0">
            <KeyRound class="h-4 w-4" aria-hidden="true" />
            {{ labels.submit }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
