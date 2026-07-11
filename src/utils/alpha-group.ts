/** First letter for A–Z grouping; non-letters go under # */
export function letterKey(label: string): string {
  const ch = label.trim().charAt(0).toUpperCase();
  return ch >= "A" && ch <= "Z" ? ch : "#";
}

export type AlphaGroup<T> = {
  key: string;
  items: T[];
};

/**
 * Group items by first letter of their display label.
 * Keys ordered A–Z, with # last.
 */
export function groupByLetter<T>(
  items: T[],
  getLabel: (item: T) => string,
): AlphaGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = letterKey(getLabel(item));
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const keys = Array.from(groups.keys()).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  return keys.map((key) => ({ key, items: groups.get(key)! }));
}
