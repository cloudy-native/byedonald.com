/**
 * Generates a page title for news day pages.
 *
 * @param dateStr - A date string in YYYY-MM-DD format
 * @returns Title in the format "Trump News for {weekday}, {month} {day}, {year}"
 */
export function getNewsDayTitle(dateStr: string): string {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // zero-indexed for Date constructor
  const day = Number(dayStr);

  // Use component constructor to avoid UTC timezone issues
  const date = new Date(year, month, day);

  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `Trump News for ${formatted}`;
}
