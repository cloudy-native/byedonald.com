import * as fs from "fs/promises";
import * as path from "path";
import {
  deduplicateArticles,
  type TaggedNewsArticle,
  type TaggedNewsResponse,
} from "./lib/article-utils";

function toDateString(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // Expect ISO like 2023-02-10T12:34:56Z; take first 10 chars
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10) || null;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return iso.slice(0, 10) || null;
  }
}

async function readJson(filePath: string): Promise<TaggedNewsResponse | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as TaggedNewsResponse;
    // Basic shape guard
    if (!parsed || !Array.isArray(parsed.articles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeJsonAtomic(
  filePath: string,
  data: TaggedNewsResponse,
): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2));
  await fs.rename(tmpPath, filePath);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function run() {
  const TAGGED_DIR = path.join(__dirname, "..", "data", "news", "tagged");
  await ensureDir(TAGGED_DIR);

  const files = (await fs.readdir(TAGGED_DIR)).filter((f) =>
    f.endsWith(".json"),
  );

  const dateFileMap = new Map<string, string>(); // date => filePath
  for (const f of files) {
    const date = path.basename(f, ".json"); // YYYY-MM-DD
    dateFileMap.set(date, path.join(TAGGED_DIR, f));
  }

  const toAppend: Record<string, TaggedNewsArticle[]> = {}; // date => articles to add
  const toWriteCurrent: Array<{ filePath: string; data: TaggedNewsResponse }> =
    [];

  let movedCount = 0;

  for (const f of files) {
    const filePath = path.join(TAGGED_DIR, f);
    const fileDate = path.basename(f, ".json");
    const data = await readJson(filePath);
    if (!data) continue;

    const stay: TaggedNewsArticle[] = [];
    const moveGroups: Record<string, TaggedNewsArticle[]> = {};

    for (const a of data.articles) {
      const d = toDateString(a.publishedAt);
      if (!d || d === fileDate) {
        stay.push(a);
      } else {
        if (!moveGroups[d]) moveGroups[d] = [];
        moveGroups[d].push(a);
      }
    }

    // Record moves
    for (const [d, arr] of Object.entries(moveGroups)) {
      if (!toAppend[d]) toAppend[d] = [];
      toAppend[d].push(...arr);
      movedCount += arr.length;
    }

    // Prepare updated current file (only the ones that stay)
    if (stay.length !== data.articles.length) {
      const deduped = deduplicateArticles(stay);
      toWriteCurrent.push({
        filePath,
        data: { ...data, totalResults: deduped.length, articles: deduped },
      });
    }
  }

  // Apply updates to current files first
  for (const item of toWriteCurrent) {
    await writeJsonAtomic(item.filePath, item.data);
  }

  // Append moved articles to their target date files
  for (const [date, arr] of Object.entries(toAppend)) {
    const targetPath =
      dateFileMap.get(date) || path.join(TAGGED_DIR, `${date}.json`);

    let target = await readJson(targetPath);
    if (!target) {
      target = {
        status: "ok",
        totalResults: 0,
        articles: [],
      } as TaggedNewsResponse;
    }

    const merged = deduplicateArticles<TaggedNewsArticle>([
      ...target.articles,
      ...arr,
    ]);
    const updated: TaggedNewsResponse = {
      ...target,
      totalResults: merged.length,
      articles: merged,
    };
    await writeJsonAtomic(targetPath, updated);
  }

  console.log(
    `Moved ${movedCount} article(s) to correct date files across ${Object.keys(toAppend).length} day(s).`,
  );
  console.log(`Updated ${toWriteCurrent.length} source file(s) after moving.`);
}

run().catch((err) => {
  console.error("Error moving articles to correct date files:", err);
  process.exit(1);
});
