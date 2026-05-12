<script setup lang="ts">
import {
  Check,
  Github,
  KeyRound,
  Languages,
  LoaderCircle,
  MonitorCog,
  MoonStar,
  Pencil,
  Plus,
  SunMedium,
  Trash2,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { ConnectionSettings } from "@/api/http";
import HeadscaleLogo from "@/components/HeadscaleLogo.vue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useActionFeedback } from "@/composables/useActionFeedback";
import { useDisplayHelpers } from "@/composables/useDisplayHelpers";
import { newProfileId, useProfiles } from "@/composables/useProfiles";
import { isThemeMode, type ThemeMode, useTheme } from "@/composables/useTheme";
import { LOCALE_META, type Locale, SUPPORTED_LOCALES, useHeadscaleI18n } from "@/i18n";
import type { ConnectionProfile } from "@/lib/profile-storage";

const apiKeyCommand = "headscale apikeys create --expiration 90d";
const headscaleRemoteCliDocsUrl = "https://docs.headscale.org/ref/remote-cli/";
const githubRepositoryUrl = "https://github.com/MunMunMiao/headscale-ui";

const { t, locale, setLocale } = useHeadscaleI18n();
const { colorMode, themeModes, setTheme } = useTheme();
const { lastError } = useActionFeedback();
const {
  profiles,
  connectionForm,
  isConnecting,
  isRestoringSession,
  authenticatingProfileId,
  selectedProfile,
  connectionDialogOpen,
  connectionCloseConfirmOpen,
  profileValidationDialogOpen,
  profileValidationError,
  pendingDeleteProfile,
  enterProfile,
  loadProfile,
  openConnectionDialog,
  closeConnectionDialog,
  addProfile,
  persistConnection,
  editProfile,
  deleteProfile,
  confirmDeleteProfile,
} = useProfiles();

const route = useRoute();
const router = useRouter();

const connectionFormBaseline = ref("");
const restoringProfileId = ref("");

const themeLabel = computed(() => themeModeLabel(colorMode.value));
const restoringProfile = computed(() => {
  const profileId = restoringProfileId.value;
  return profileId ? profiles.value.find((profile) => profile.id === profileId) : null;
});

function themeModeLabel(mode: ThemeMode) {
  if (mode === "dark") {
    return t("dark");
  }
  if (mode === "light") {
    return t("light");
  }
  return t("system");
}

function profileAvatarLabel(profile: ConnectionProfile) {
  const source = profile.name || profile.baseUrl;
  return source.trim().slice(0, 2).toUpperCase() || "HS";
}

function profileModeLabel(mode: ConnectionSettings["mode"]) {
  return mode === "mock" ? t("mockMode") : t("realMode");
}

const { formatDate } = useDisplayHelpers();

function changeLocale(nextLocale: string) {
  if (SUPPORTED_LOCALES.includes(nextLocale as Locale)) {
    setLocale(nextLocale as Locale);
  }
}

function changeTheme(nextTheme: string) {
  if (isThemeMode(nextTheme)) {
    setTheme(nextTheme);
  }
}

function chooseLocale(option: Locale) {
  changeLocale(option);
}

function chooseTheme(mode: ThemeMode) {
  changeTheme(mode);
}

function serializeConnectionForm() {
  return JSON.stringify({
    apiKey: connectionForm.apiKey,
    baseUrl: connectionForm.baseUrl,
    mode: connectionForm.mode,
    profileId: connectionForm.profileId,
    profileName: connectionForm.profileName,
    remember: connectionForm.remember,
  });
}

function syncConnectionFormBaseline() {
  connectionFormBaseline.value = serializeConnectionForm();
}

function isConnectionFormDirty() {
  return serializeConnectionForm() !== connectionFormBaseline.value;
}

function openConnectionDialogWithBaseline(profileId: string) {
  openConnectionDialog(profileId);
  syncConnectionFormBaseline();
}

function editProfileWithBaseline(profile: ConnectionProfile) {
  editProfile(profile);
  syncConnectionFormBaseline();
}

function requestConnectionDialogClose() {
  if (isConnectionFormDirty()) {
    connectionCloseConfirmOpen.value = true;
    return;
  }

  closeConnectionDialog();
}

function confirmConnectionDialogClose() {
  syncConnectionFormBaseline();
  closeConnectionDialog();
}

function handleConnectionDialogOpen(open: boolean) {
  if (open) {
    connectionDialogOpen.value = true;
    return;
  }

  requestConnectionDialogClose();
}

function handleConnectionCloseConfirmOpen(open: boolean) {
  connectionCloseConfirmOpen.value = open;
}

function originalOutsideEventTarget(event: Event) {
  const originalEvent = (event as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent;
  const target = originalEvent?.target ?? event.target;
  return target instanceof HTMLElement ? target : null;
}

function preventConnectionDialogOutsideClose(event: Event) {
  const target = originalOutsideEventTarget(event);
  if (target?.closest('[data-slot="alert-dialog-content"]')) {
    return;
  }

  event.preventDefault();
}

function handleConnectionDialogEscape(event: Event) {
  event.preventDefault();
  requestConnectionDialogClose();
}

function reviewProfileConnection() {
  lastError.value = profileValidationError.value;
  profileValidationDialogOpen.value = false;
}

function continueAddingProfile() {
  persistConnection();
  syncConnectionFormBaseline();
  profileValidationDialogOpen.value = false;
  profileValidationError.value = "";
  lastError.value = "";
  closeConnectionDialog();
}

async function submitAddProfile() {
  await addProfile();
  if (!profileValidationDialogOpen.value) {
    syncConnectionFormBaseline();
  }
}

function requestDeleteProfile(profile: ConnectionProfile) {
  deleteProfile(profile);
}

function handleDeleteProfileDialogOpen(open: boolean) {
  if (!open) {
    window.setTimeout(() => {
      pendingDeleteProfile.value = null;
    }, 0);
  }
}

async function enterProfileAndRoute(profile: ConnectionProfile) {
  restoringProfileId.value = profile.id;
  const succeeded = await enterProfile(profile);
  if (succeeded) {
    await router.push({ name: "home" });
  } else {
    restoringProfileId.value = "";
  }
}

onMounted(() => {
  // TODO: auto-login via route.query.profile (legacy URL compatibility).
  // The main thread will complete this integration when wiring the new router.
  void route;
});
</script>

<template>
  <main class="min-h-screen bg-background">
    <section
      v-if="isRestoringSession && restoringProfile"
      class="flex min-h-screen items-center justify-center px-4"
      data-testid="session-restore"
    >
      <div class="grid justify-items-center gap-4 text-center text-sm text-muted-foreground">
        <div class="relative flex h-16 w-16 items-center justify-center rounded-full border bg-card shadow-sm">
          <HeadscaleLogo class="h-9 w-9 opacity-60" />
          <LoaderCircle class="absolute h-16 w-16 animate-spin text-primary" aria-hidden="true" />
        </div>
        <div class="grid gap-1">
          <p class="font-medium text-foreground">{{ restoringProfile?.name ?? t("profile") }}</p>
          <p>{{ t("checkingCredentials") }}</p>
        </div>
      </div>
    </section>

    <section v-else class="min-h-screen bg-background">
      <header class="border-b bg-card text-card-foreground">
        <div class="container mx-auto flex h-14 w-full items-center gap-3 px-4">
          <div class="flex min-w-0 items-center gap-2">
            <HeadscaleLogo class="h-8 w-8 shrink-0" />
            <span class="truncate text-sm font-semibold leading-none sm:text-base">Headscale UI</span>
          </div>

          <div class="ms-auto flex items-center gap-1">
            <Button
              as="a"
              :href="githubRepositoryUrl"
              target="_blank"
              rel="noreferrer"
              variant="ghost"
              size="icon"
              title="GitHub"
              aria-label="GitHub"
              data-testid="github-repository-link"
            >
              <Github class="h-5 w-5" aria-hidden="true" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-testid="locale-select"
                  :aria-label="`${t('language')}: ${LOCALE_META[locale].nativeLabel}`"
                >
                  <Languages class="h-5 w-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-48">
                <DropdownMenuLabel>{{ t("language") }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="option in SUPPORTED_LOCALES"
                  :key="option"
                  :data-testid="`locale-option-${option}`"
                  @click="chooseLocale(option)"
                >
                  <span>{{ LOCALE_META[option].nativeLabel }}</span>
                  <Check v-if="locale === option" class="ms-auto h-4 w-4" aria-hidden="true" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-testid="theme-select"
                  :aria-label="`${t('theme')}: ${themeLabel}`"
                >
                  <SunMedium v-if="colorMode === 'light'" class="h-5 w-5" aria-hidden="true" />
                  <MoonStar v-else-if="colorMode === 'dark'" class="h-5 w-5" aria-hidden="true" />
                  <MonitorCog v-else class="h-5 w-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-44">
                <DropdownMenuLabel>{{ t("theme") }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="mode in themeModes"
                  :key="mode"
                  :data-testid="`theme-option-${mode}`"
                  @click="chooseTheme(mode)"
                >
                  <SunMedium v-if="mode === 'light'" class="h-4 w-4" aria-hidden="true" />
                  <MoonStar v-else-if="mode === 'dark'" class="h-4 w-4" aria-hidden="true" />
                  <MonitorCog v-else class="h-4 w-4" aria-hidden="true" />
                  <span>{{ themeModeLabel(mode) }}</span>
                  <Check v-if="colorMode === mode" class="ms-auto h-4 w-4" aria-hidden="true" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div class="container mx-auto flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center px-4 py-8 sm:py-10">
        <div class="w-full max-w-5xl min-w-0 text-center">
          <div class="mx-auto max-w-2xl">
            <h1 class="text-2xl font-semibold sm:text-3xl">{{ t("profileSelectorTitle") }}</h1>
            <p class="mt-2 text-sm text-muted-foreground sm:text-base">
              {{ t("profileSelectorDescription") }}
            </p>
          </div>

          <div
            v-if="lastError && !connectionDialogOpen"
            data-testid="login-error"
            role="alert"
            class="mx-auto mt-4 max-w-xl rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-start text-sm text-destructive"
          >
            {{ lastError }}
          </div>

          <div class="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="profile-picker">
            <div
              v-for="profile in profiles"
              :key="profile.id"
              class="relative min-w-0"
              :data-testid="`profile-row-${profile.name}`"
            >
              <Button
                type="button"
                variant="ghost"
                :data-testid="`profile-option-${profile.name}`"
                class="h-auto min-h-36 w-full flex-col items-center justify-center gap-3 border bg-card p-4 text-center hover:bg-accent hover:text-accent-foreground"
                :aria-busy="authenticatingProfileId === profile.id"
                :disabled="isConnecting"
                @click="enterProfileAndRoute(profile)"
              >
                <span
                  class="relative flex h-16 w-16 items-center justify-center rounded-full border bg-background text-lg font-semibold transition-colors"
                  :class="authenticatingProfileId === profile.id ? 'border-primary/50 bg-primary/10 text-primary' : ''"
                >
                  <LoaderCircle
                    v-if="authenticatingProfileId === profile.id"
                    class="absolute h-14 w-14 animate-spin"
                    aria-hidden="true"
                    :data-testid="`profile-loading-${profile.name}`"
                  />
                  <span :class="authenticatingProfileId === profile.id ? 'opacity-35' : ''">
                    {{ profileAvatarLabel(profile) }}
                  </span>
                </span>
                <span class="grid w-full min-w-0 gap-1">
                  <span class="truncate text-sm font-semibold">{{ profile.name }}</span>
                  <span class="break-all text-xs text-muted-foreground">{{ profile.baseUrl }}</span>
                  <span v-if="authenticatingProfileId === profile.id" class="text-xs text-primary">
                    {{ t("checkingCredentials") }}
                  </span>
                  <span v-else class="text-xs text-muted-foreground">
                    {{ profileModeLabel(profile.mode) }} · {{ t("updatedProfile") }} {{ formatDate(profile.updatedAt) }}
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                :data-testid="`edit-profile-${profile.name}`"
                class="absolute start-2 top-2 h-8 w-8 bg-background/80"
                :aria-label="t('editProfile')"
                :disabled="isConnecting"
                @click.stop="editProfileWithBaseline(profile)"
              >
                <Pencil class="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                :data-testid="`delete-profile-${profile.name}`"
                class="absolute end-2 top-2 h-8 w-8 bg-background/80"
                :aria-label="t('deleteProfile')"
                :disabled="isConnecting"
                @click.stop="requestDeleteProfile(profile)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              data-testid="profile-option-new"
              class="h-auto min-h-36 flex-col items-center justify-center gap-3 border border-dashed bg-card p-4 text-center hover:bg-accent hover:text-accent-foreground"
              @click="openConnectionDialogWithBaseline(newProfileId)"
            >
              <span class="flex h-14 w-14 items-center justify-center rounded-full border bg-background">
                <Plus class="h-6 w-6" aria-hidden="true" />
              </span>
              <span class="grid gap-1">
                <span class="text-sm font-semibold">{{ t("addServerProfile") }}</span>
                <span class="text-xs text-muted-foreground">{{ t("newProfile") }}</span>
              </span>
            </Button>
          </div>
        </div>
      </div>

      <Dialog :open="connectionDialogOpen" @update:open="handleConnectionDialogOpen">
        <DialogContent
          class="grid max-h-[calc(100svh-0.5rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-h-[calc(100svh-4rem)] sm:max-w-2xl"
          data-testid="connection-dialog"
          :show-close-button="false"
          @escape-key-down="handleConnectionDialogEscape"
          @interact-outside="preventConnectionDialogOutsideClose"
          @pointer-down-outside="preventConnectionDialogOutsideClose"
        >
          <DialogHeader class="px-4 pb-2 pe-10 pt-3 text-start sm:px-6 sm:pb-3 sm:pt-6">
            <DialogTitle class="truncate">
              {{ selectedProfile ? `${t("editProfile")} ${selectedProfile.name}` : t("addServerProfile") }}
            </DialogTitle>
            <DialogDescription class="text-sm leading-5">{{ t("connectSubtitle") }}</DialogDescription>
          </DialogHeader>

          <form class="flex min-h-0 flex-col" data-testid="connect-form" @submit.prevent="submitAddProfile">
            <div class="grid min-h-0 min-w-0 gap-2 overflow-y-auto px-4 pb-2 sm:gap-4 sm:px-6 sm:pb-3 md:grid-cols-2">
              <div class="min-w-0">
                <Label for="connect-profile-name">{{ t("profileName") }}</Label>
                <Input
                  id="connect-profile-name"
                  v-model="connectionForm.profileName"
                  data-testid="connect-profile-name"
                  class="mt-1.5"
                />
              </div>

              <div class="min-w-0 [&_[data-slot=native-select-wrapper]]:w-full">
                <Label for="connect-mode">{{ t("mode") }}</Label>
                <NativeSelect id="connect-mode" v-model="connectionForm.mode" data-testid="connect-mode" class="mt-1.5">
                  <NativeSelectOption value="mock">{{ t("mockMode") }}</NativeSelectOption>
                  <NativeSelectOption value="real">{{ t("realMode") }}</NativeSelectOption>
                </NativeSelect>
              </div>

              <div class="min-w-0 md:col-span-2">
                <Label for="connect-server-url">{{ t("serverUrl") }}</Label>
                <Input
                  id="connect-server-url"
                  v-model="connectionForm.baseUrl"
                  data-testid="connect-server-url"
                  class="mt-1.5"
                />
              </div>

              <div class="min-w-0 md:col-span-2">
                <Label for="connect-api-key">{{ t("apiKey") }}</Label>
                <Input
                  id="connect-api-key"
                  v-model="connectionForm.apiKey"
                  data-testid="connect-api-key"
                  type="password"
                  class="mt-1.5"
                  :placeholder="t('apiKeyPlaceholder')"
                />
              </div>

              <div class="flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm md:col-span-2">
                <Checkbox id="connect-remember" v-model="connectionForm.remember" data-testid="connect-remember" />
                <Label for="connect-remember">{{ t("rememberConnection") }}</Label>
              </div>

              <details class="group min-w-0 rounded-md border bg-muted/35 p-3 text-sm md:col-span-2" data-testid="api-key-guide">
                <summary class="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
                  <KeyRound class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div class="min-w-0">
                    <h3 class="font-medium">{{ t("apiKeyGuideTitle") }}</h3>
                    <p class="mt-1 text-muted-foreground">{{ t("apiKeyGuideDescription") }}</p>
                  </div>
                </summary>
                <div class="mt-3 rounded-md border bg-background p-3">
                  <p class="text-xs font-medium text-muted-foreground">{{ t("apiKeyGuideCommandLabel") }}</p>
                  <code class="mt-2 block break-all font-mono text-xs text-foreground">{{ apiKeyCommand }}</code>
                </div>
                <ol class="mt-3 grid gap-1 ps-5 text-xs text-muted-foreground">
                  <li>{{ t("apiKeyGuideStepServer") }}</li>
                  <li>{{ t("apiKeyGuideStepCreate") }}</li>
                  <li>{{ t("apiKeyGuideStepCopy") }}</li>
                  <li>{{ t("apiKeyGuideStepPaste") }}</li>
                </ol>
                <p class="mt-3 text-xs text-muted-foreground">{{ t("apiKeyGuideHint") }}</p>
                <a
                  :href="headscaleRemoteCliDocsUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="mt-3 inline-flex cursor-pointer text-xs font-medium text-primary underline-offset-4 hover:underline"
                  data-testid="api-key-docs-link"
                >
                  {{ t("headscaleDocs") }}
                </a>
              </details>
            </div>

            <div class="grid shrink-0 gap-2 border-t bg-background p-2.5 sm:gap-3 sm:px-6 sm:py-4 md:grid-cols-2" data-testid="connect-footer">
              <p
                v-if="lastError"
                data-testid="connect-error"
                role="alert"
                class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2"
              >
                {{ lastError }}
              </p>

              <DialogFooter class="flex-row gap-2 sm:justify-end md:col-span-2">
                <Button type="button" variant="outline" class="flex-1 sm:flex-none" data-testid="connect-close" @click="requestConnectionDialogClose">
                  {{ t("close") }}
                </Button>
                <Button type="submit" class="flex-1 sm:flex-none" data-testid="connect-submit" :disabled="isConnecting">
                  <LoaderCircle v-if="isConnecting" class="h-4 w-4 animate-spin" aria-hidden="true" />
                  <Plus v-else class="h-4 w-4" aria-hidden="true" />
                  {{ isConnecting ? t("addingProfile") : t("addProfile") }}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog :open="connectionCloseConfirmOpen" @update:open="handleConnectionCloseConfirmOpen">
        <AlertDialogContent data-testid="discard-profile-changes-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t("discardProfileChangesTitle") }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ t("discardProfileChangesDescription") }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="keep-editing-profile">
              {{ t("keepEditingProfile") }}
            </AlertDialogCancel>
            <AlertDialogAction data-testid="discard-profile-changes" @click="confirmConnectionDialogClose">
              {{ t("discardProfileChanges") }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog v-model:open="profileValidationDialogOpen">
        <AlertDialogContent data-testid="profile-validation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t("continueAddProfileTitle") }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ t("continueAddProfileDescription") }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p
            v-if="profileValidationError"
            data-testid="profile-validation-error"
            class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {{ profileValidationError }}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="review-profile-connection" @click="reviewProfileConnection">
              {{ t("reviewProfileConnection") }}
            </AlertDialogCancel>
            <AlertDialogAction data-testid="continue-add-profile" @click="continueAddingProfile">
              {{ t("continueAddProfile") }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog :open="Boolean(pendingDeleteProfile)" @update:open="handleDeleteProfileDialogOpen">
        <AlertDialogContent data-testid="delete-profile-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t("confirmDeleteProfileTitle") }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ t("confirmDeleteProfileDescription") }}
              <span v-if="pendingDeleteProfile" class="mt-2 block break-all font-medium text-foreground">
                {{ pendingDeleteProfile.name }} · {{ pendingDeleteProfile.baseUrl }}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-profile">{{ t("cancel") }}</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-profile" @click="confirmDeleteProfile">
              {{ t("deleteProfile") }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  </main>
</template>

<style scoped>
/* No scoped styles; styling uses tailwind utility classes. */
</style>

