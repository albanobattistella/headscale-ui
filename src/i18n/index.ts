import { computed } from "vue";
import { createI18n, useI18n as useVueI18n } from "vue-i18n";
import type { OperationGroup, OperationId } from "@/domain/headscale-operations";
import { DEFAULT_LOCALE, isLocale, LOCALE_META, type Locale, SUPPORTED_LOCALES } from "./locales";
import { commonMessages, getGroupLabel, getOperationMessage, type MessageKey } from "./messages";

const storageKey = "headscale-ui-locale";

function initialLocale(): Locale {
  if (typeof localStorage === "undefined") {
    return DEFAULT_LOCALE;
  }

  const saved = localStorage.getItem(storageKey);
  return saved && isLocale(saved) ? saved : DEFAULT_LOCALE;
}

const startingLocale = initialLocale();

export const i18n = createI18n<[Record<MessageKey, string>], Locale>({
  legacy: false,
  globalInjection: false,
  locale: startingLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: commonMessages,
});

function syncDocument(locale: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_META[locale].dir;
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(storageKey, locale);
  }
}

syncDocument(startingLocale);

export function useHeadscaleI18n() {
  const composer = useVueI18n<[Record<MessageKey, string>], Locale>({
    useScope: "global",
  });
  const locale = computed(() => composer.locale.value);
  const meta = computed(() => LOCALE_META[composer.locale.value]);

  function setLocale(localeValue: Locale) {
    composer.locale.value = localeValue;
    syncDocument(localeValue);
  }

  function t(key: MessageKey, named?: Record<string, string | number>): string {
    return named !== undefined ? composer.t(key, named) : composer.t(key);
  }

  function tg(group: OperationGroup) {
    return getGroupLabel(composer.locale.value, group);
  }

  function toperation(id: OperationId) {
    return getOperationMessage(composer.locale.value, id);
  }

  return {
    locale,
    meta,
    setLocale,
    t,
    tg,
    toperation,
  };
}

export type { Locale };
export { LOCALE_META, SUPPORTED_LOCALES };
