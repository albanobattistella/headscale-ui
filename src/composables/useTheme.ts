import { type Ref, ref, watchEffect } from "vue";
import { readSetting, writeSetting } from "@/lib/settings-storage";

export type ThemeMode = "light" | "dark" | "auto";

const THEME_SETTING_KEY = "theme";
export const themeModes: ThemeMode[] = ["light", "dark", "auto"];

function initialThemeMode(): ThemeMode {
  const saved = readSetting(THEME_SETTING_KEY);
  return isThemeMode(saved) ? saved : "auto";
}

function prefersDarkMode() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "auto";
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle(
      "dark",
      mode === "dark" || (mode === "auto" && prefersDarkMode()),
    );
  }
  writeSetting(THEME_SETTING_KEY, mode);
}

interface UseThemeReturn {
  colorMode: Ref<ThemeMode>;
  themeModes: readonly ThemeMode[];
  setTheme(mode: ThemeMode): void;
}

let instance: UseThemeReturn | null = null;

/** Internal: invoked by `__testing.ts` only. */
export const themeTestingHandle = {
  reset() {
    instance = null;
  },
};

export function useTheme(): UseThemeReturn {
  if (instance) return instance;
  const colorMode = ref<ThemeMode>(initialThemeMode());
  watchEffect(() => {
    applyThemeMode(colorMode.value);
  });
  instance = {
    colorMode,
    themeModes,
    setTheme(mode: ThemeMode) {
      colorMode.value = mode;
      applyThemeMode(mode);
    },
  };
  return instance;
}
