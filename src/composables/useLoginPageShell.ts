import { computed } from "vue";
import { type Locale, SUPPORTED_LOCALES, useHeadscaleI18n } from "@/i18n";
import { isThemeMode, type ThemeMode, useTheme } from "./useTheme";

export function useLoginPageShell() {
  const { t, setLocale } = useHeadscaleI18n();
  const { colorMode, themeModes, setTheme } = useTheme();

  function themeModeLabel(mode: ThemeMode) {
    if (mode === "dark") return t("dark");
    if (mode === "light") return t("light");
    return t("system");
  }

  const themeLabel = computed(() => themeModeLabel(colorMode.value));

  function changeLocale(nextLocale: string) {
    if (SUPPORTED_LOCALES.includes(nextLocale as Locale)) {
      setLocale(nextLocale as Locale);
    }
  }

  function changeTheme(nextTheme: string) {
    if (isThemeMode(nextTheme)) setTheme(nextTheme);
  }

  function chooseLocale(option: Locale) {
    changeLocale(option);
  }

  function chooseTheme(mode: ThemeMode) {
    changeTheme(mode);
  }

  return {
    colorMode,
    themeModes,
    themeLabel,
    themeModeLabel,
    chooseLocale,
    chooseTheme,
  };
}
