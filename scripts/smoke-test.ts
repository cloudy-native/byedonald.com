/**
 * Smoke test script for the Astro build output.
 *
 * Validates:
 * - Build produced output (dist/ directory exists with HTML files)
 * - Page count is within ±5 of baseline
 * - Key pages contain expected content elements
 *
 * Run with: npx tsx scripts/smoke-test.ts
 *
 * Validates Requirements: 11.1, 11.2, 11.3, 11.5
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Baseline page count from the Astro build (~2,223 pages including news days, tags, sources). */
const BASELINE_PAGE_COUNT = 2254;

/** Allowed deviation from baseline. */
const PAGE_COUNT_TOLERANCE = 5;

/** Build output directory (Astro default). */
const DIST_DIR = join(process.cwd(), "dist");

/** Key pages to smoke-test with their expected content elements. */
const KEY_PAGES: Array<{
  /** Path to the HTML file relative to dist/ */
  path: string;
  /** Human-readable page description */
  label: string;
  /** Content marker that must be present in the HTML (substring match) */
  expectedContent: string;
}> = [
  {
    path: "index.html",
    label: "Homepage",
    expectedContent: "calendar",
  },
  {
    path: "news/2023-01-20/index.html",
    label: "News day page (2023-01-20)",
    expectedContent: "article",
  },
  {
    path: "tags/index.html",
    label: "Tags index page",
    expectedContent: "tag",
  },
  {
    path: "sources/index.html",
    label: "Sources index page",
    expectedContent: "source",
  },
  {
    path: "about/index.html",
    label: "About page",
    expectedContent: "about",
  },
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

interface Failure {
  page: string;
  reason: string;
}

/**
 * Recursively count all .html files under a directory.
 */
function countHtmlFiles(dir: string): number {
  let count = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countHtmlFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      count++;
    }
  }
  return count;
}

/**
 * Read an HTML file and do a case-insensitive substring check for content.
 */
function pageContains(filePath: string, content: string): boolean {
  const html = readFileSync(filePath, "utf-8").toLowerCase();
  return html.includes(content.toLowerCase());
}

// ---------------------------------------------------------------------------
// Validation Steps
// ---------------------------------------------------------------------------

function validateDistExists(): Failure[] {
  const failures: Failure[] = [];
  if (!existsSync(DIST_DIR) || !statSync(DIST_DIR).isDirectory()) {
    failures.push({
      page: DIST_DIR,
      reason: `Build output directory '${DIST_DIR}' does not exist. Did 'astro build' complete successfully?`,
    });
  }
  return failures;
}

function validatePageCount(): { count: number; failures: Failure[] } {
  const failures: Failure[] = [];
  const count = countHtmlFiles(DIST_DIR);
  const low = BASELINE_PAGE_COUNT - PAGE_COUNT_TOLERANCE;
  const high = BASELINE_PAGE_COUNT + PAGE_COUNT_TOLERANCE;

  if (count < low || count > high) {
    failures.push({
      page: "(page count)",
      reason: `Page count ${count} is outside the acceptable range [${low}, ${high}] (baseline: ${BASELINE_PAGE_COUNT} ±${PAGE_COUNT_TOLERANCE})`,
    });
  }

  return { count, failures };
}

function validateKeyPages(): Failure[] {
  const failures: Failure[] = [];

  for (const page of KEY_PAGES) {
    const filePath = join(DIST_DIR, page.path);

    if (!existsSync(filePath)) {
      failures.push({
        page: page.path,
        reason: `Key page '${page.label}' not found at ${page.path}`,
      });
      continue;
    }

    if (!pageContains(filePath, page.expectedContent)) {
      failures.push({
        page: page.path,
        reason: `Key page '${page.label}' does not contain expected content element: "${page.expectedContent}"`,
      });
    }
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log("🔍 Running smoke tests on build output...\n");
  console.log(`   Output directory: ${DIST_DIR}`);
  console.log(`   Baseline page count: ${BASELINE_PAGE_COUNT} (±${PAGE_COUNT_TOLERANCE})\n`);

  // Step 1: Verify dist/ exists
  const distFailures = validateDistExists();
  if (distFailures.length > 0) {
    reportFailures(distFailures);
    process.exit(1);
  }
  console.log("✅ Build output directory exists\n");

  // Step 2: Validate page count
  const { count, failures: countFailures } = validatePageCount();
  console.log(`   Generated pages: ${count}`);
  if (countFailures.length > 0) {
    reportFailures(countFailures);
    process.exit(1);
  }
  console.log("✅ Page count within acceptable range\n");

  // Step 3: Validate key pages
  const pageFailures = validateKeyPages();
  if (pageFailures.length > 0) {
    reportFailures(pageFailures);
    process.exit(1);
  }
  console.log("✅ All key pages contain expected content\n");

  console.log("🎉 All smoke tests passed!");
}

function reportFailures(failures: Failure[]): void {
  console.error("\n❌ Smoke test FAILED:\n");
  for (const f of failures) {
    console.error(`   Page: ${f.page}`);
    console.error(`   Reason: ${f.reason}\n`);
  }
}

main();
