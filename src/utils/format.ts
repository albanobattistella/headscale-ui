const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Format an ISO date string for table cells. Returns `fallback` for empty input,
 * the raw value when un-parseable, otherwise a locale-aware short date+time.
 */
export function formatDate(value: string | undefined, locale: string, fallback: string): string {
  if (!value) return fallback;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return new Intl.DateTimeFormat(locale, DATE_FORMAT_OPTIONS).format(new Date(time));
}
