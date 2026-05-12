import { type Locale, SUPPORTED_LOCALES } from "./locales";
import { englishCopy, type ProductCopy, productCopy } from "./product-copy";

// Locales whose product-copy blocks intentionally inherit the English copy
// via `...englishCopy` spread rather than translating every key. zh keeps its
// own hand-written block; zh-Hant is mechanically derived from zh.
const DEFAULT_LOCALE: Locale = "en";
const SELF_CONTAINED: ReadonlySet<Locale> = new Set(["en", "zh", "zh-Hant"]);

/**
 * Walk every non-default locale and surface any product-copy keys whose value
 * is still strictly === the English original — i.e. the locale block omitted
 * the translation and only inherits it via `...englishCopy` spread. Logs a
 * collapsed group to the console when run; never throws.
 *
 * Wired into `main.ts` under `import.meta.env.DEV`, so production builds drop
 * the entire helper through tree-shaking.
 */
export function reportMissingTranslations(): void {
  const englishKeys = Object.keys(englishCopy) as (keyof ProductCopy)[];
  const report = new Map<Locale, string[]>();

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    if (SELF_CONTAINED.has(locale)) continue;
    const bundle = productCopy[locale];
    const missing: string[] = [];
    for (const key of englishKeys) {
      if (bundle[key] === englishCopy[key]) missing.push(String(key));
    }
    if (missing.length > 0) report.set(locale, missing);
  }

  if (report.size === 0) return;

  console.groupCollapsed(
    `[i18n] ${report.size} locale(s) still fall back to English for some product-copy keys`,
  );
  for (const [locale, keys] of report) {
    console.warn(`${locale}: ${keys.length} key(s)`);
    console.warn(keys.join(", "));
  }
  console.groupEnd();
}
