export const DEFAULT_LOCALE = "en";

export const SUPPORTED_LOCALES = ["en", "zh", "fr", "ru", "es", "ar"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export interface LocaleMeta {
  code: Locale;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  zh: { code: "zh", label: "Chinese", nativeLabel: "简体中文", dir: "ltr" },
  fr: { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  ru: { code: "ru", label: "Russian", nativeLabel: "Русский", dir: "ltr" },
  es: { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr" },
  ar: { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
};

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
