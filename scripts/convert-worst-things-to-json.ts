import fs from "node:fs/promises";
import path from "node:path";
import * as dotenv from "dotenv";
import type { NewsArticle } from "./lib/article-utils";
import { NewsArticleTagger, type TagDefinition } from "./tag-news";

type WorstThingItem = {
  id: number;
  text: string;
  tags: string[];
};

type WorstThingsMonth = {
  year: number;
  month: number; // 1-12
  items: WorstThingItem[];
};

type WorstThingsData = {
  months: WorstThingsMonth[];
};

const MONTHS: Record<string, number> = {
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  MAY: 5,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
};

const monthHeaderRe = /^([A-Z]+)\s+(\d{4})\s*$/;
const itemStartRe = /^(\d+)\.\s+(.*)$/;

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addOneMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function monthsInclusiveCount(
  start: { year: number; month: number },
  end: { year: number; month: number },
): number {
  const startIndex = start.year * 12 + (start.month - 1);
  const endIndex = end.year * 12 + (end.month - 1);
  return endIndex - startIndex + 1;
}

function parseMonthHeader(line: string): { year: number; month: number } | null {
  const m = monthHeaderRe.exec(line.trim());
  if (!m) return null;

  const monthName = m[1];
  const year = Number(m[2]);
  const month = MONTHS[monthName];
  if (!month) {
    throw new Error(`Unrecognized month name in header: "${monthName}"`);
  }
  return { year, month };
}

function normalizeEntryText(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compactOneLine(s: string, maxLen: number): string {
  const compact = (s ?? "").replace(/\s+/g, " ").trim();
  if (compact.length <= maxLen) return compact;
  return `${compact.slice(0, maxLen)}…`;
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const inputDir = path.join(repoRoot, "data", "worst-things");
  const inputPath = path.join(inputDir, "worst-things-all.txt");
  const outputPath = path.join(inputDir, "worst-things.json");

  dotenv.config({ path: path.join(repoRoot, ".env") });

  await fs.access(inputPath);

  const months: WorstThingsMonth[] = [];
  const seenIds = new Set<number>();

  const seenMonths = new Set<string>();
  let firstMonth: { year: number; month: number } | null = null;
  let lastMonth: { year: number; month: number } | null = null;

  let currentMonth: WorstThingsMonth | null = null;
  let currentItem: WorstThingItem | null = null;
  let currentItemLines: string[] = [];

  const flushItem = () => {
    if (!currentItem) return;
    if (!currentMonth) {
      throw new Error(`Item ${currentItem.id} encountered before any month header.`);
    }
    const text = normalizeEntryText(currentItemLines.join("\n"));
    if (!text) {
      throw new Error(`Item ${currentItem.id} has empty text.`);
    }
    currentMonth.items.push({ id: currentItem.id, text, tags: [] });
    currentItem = null;
    currentItemLines = [];
  };

  const flushMonth = () => {
    flushItem();
    if (!currentMonth) return;
    if (currentMonth.items.length === 0) {
      throw new Error(
        `Month ${currentMonth.month}/${currentMonth.year} has no items (check input formatting).`,
      );
    }
    months.push(currentMonth);
    currentMonth = null;
  };

  const raw = await fs.readFile(inputPath, "utf8");
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (trimmed === "") continue;
    if (trimmed === ".") continue;

    const header = parseMonthHeader(trimmed);
    if (header) {
      const key = monthKey(header.year, header.month);
      if (seenMonths.has(key)) {
        throw new Error(
          `Duplicate month header encountered: ${header.month}/${header.year} (${key}).`,
        );
      }

      if (!firstMonth) {
        firstMonth = { year: header.year, month: header.month };
      }

      if (lastMonth) {
        const expected = addOneMonth(lastMonth.year, lastMonth.month);
        if (expected.year !== header.year || expected.month !== header.month) {
          throw new Error(
            `Non-sequential month header. Expected ${expected.month}/${expected.year} after ${lastMonth.month}/${lastMonth.year}, but found ${header.month}/${header.year}.`,
          );
        }
      }

      flushMonth();
      currentMonth = { year: header.year, month: header.month, items: [] };
      seenMonths.add(key);
      lastMonth = { year: header.year, month: header.month };
      continue;
    }

    const itemMatch = itemStartRe.exec(trimmed);
    if (itemMatch) {
      const id = Number(itemMatch[1]);
      if (!Number.isFinite(id) || id <= 0) {
        throw new Error(`Invalid item id "${itemMatch[1]}" in worst-things-all.txt`);
      }
      if (seenIds.has(id)) {
        throw new Error(`Duplicate item id ${id} encountered (in worst-things-all.txt).`);
      }
      seenIds.add(id);

      flushItem();
      currentItem = { id, text: "", tags: [] };
      currentItemLines = [itemMatch[2]];
      continue;
    }

    if (!currentItem) {
      throw new Error(
        `Unexpected content outside of any numbered item in worst-things-all.txt: "${trimmed}"`,
      );
    }
    currentItemLines.push(trimmed);
  }

  flushMonth();

  if (!firstMonth || !lastMonth) {
    throw new Error(`No month headers found in ${inputPath}`);
  }

  const expectedMonthCount = monthsInclusiveCount(firstMonth, lastMonth);
  if (seenMonths.size !== expectedMonthCount) {
    throw new Error(
      `Month headers are not fully represented. Found ${seenMonths.size} months, expected ${expectedMonthCount} for the range ${firstMonth.month}/${firstMonth.year}..${lastMonth.month}/${lastMonth.year}.`,
    );
  }

  const missing: string[] = [];
  let cursor = { year: firstMonth.year, month: firstMonth.month };
  for (let i = 0; i < expectedMonthCount; i++) {
    const key = monthKey(cursor.year, cursor.month);
    if (!seenMonths.has(key)) missing.push(key);
    cursor = addOneMonth(cursor.year, cursor.month);
  }
  if (missing.length > 0) {
    throw new Error(`Missing month headers: ${missing.join(", ")}`);
  }

  months.sort((a, b) => (a.year - b.year ? a.year - b.year : a.month - b.month));

  const tagsFilePath = path.join(repoRoot, "data", "tags", "tags.json");
  const tagDefinitions: TagDefinition = JSON.parse(await fs.readFile(tagsFilePath, "utf8"));
  const tagger = await NewsArticleTagger.create(tagDefinitions);

  const totalItems = months.reduce((sum, m) => sum + m.items.length, 0);
  let taggedCount = 0;

  for (const month of months) {
    for (const item of month.items) {
      taggedCount++;
      console.log(
        `Tagging ${taggedCount}/${totalItems}: ${item.id} :: ${compactOneLine(item.text, 180)}`,
      );

      const publishedAt = new Date(month.year, month.month - 1, 1).toISOString();
      const article: NewsArticle = {
        source: { id: null, name: "Worst Things" },
        author: null,
        title: `Worst Thing ${item.id}`,
        description: null,
        url: `worst-things://item/${item.id}`,
        urlToImage: null,
        publishedAt,
        content: item.text,
      };

      try {
        item.tags = await tagger.tagSingleArticle(article);
        console.log(`  -> [${item.tags.join(", ")}]`);
      } catch (error) {
        console.error(`Failed to tag item ${item.id}:`, error);
        item.tags = [];
        console.log("  -> []");
      }

      await sleep(100);
    }
  }

  const out: WorstThingsData = { months };
  await fs.writeFile(outputPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath} with ${months.length} months.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
