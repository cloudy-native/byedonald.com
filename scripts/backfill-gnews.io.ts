import fs from "node:fs";
import path from "node:path";
import { fetchNewsForDate } from "./fetch-gnews.io";

const NEWS_DIR = path.join(__dirname, "..", "data", "news", "raw");
const START_OF_CALENDAR = new Date(2023, 0, 1);

/**
 * Reads the raw news directory and returns a set of dates for which files already exist.
 */
const getExistingDates = (): Set<string> => {
  try {
    if (!fs.existsSync(NEWS_DIR)) {
      console.log(`Creating news directory: ${NEWS_DIR}`);
      fs.mkdirSync(NEWS_DIR, { recursive: true });
    }
    const existingFiles = fs.readdirSync(NEWS_DIR);
    return new Set(existingFiles.map((file) => file.replace(".json", "")));
  } catch (error) {
    console.error(`Error reading news directory: ${NEWS_DIR}`, error);
    process.exit(1);
  }
};

/**
 * Generates a list of date strings from the beginning of the current year to yesterday.
 */
const getDatesToCheck = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  // Loop from the start of the year to yesterday
  for (
    let d = new Date(START_OF_CALENDAR);
    d <= yesterday;
    d.setDate(d.getDate() + 1)
  ) {
    dates.push(new Date(d).toISOString().split("T")[0]);
  }
  return dates;
};

/**
 * Main function to backfill missing news files.
 */
const backfillNews = async () => {
  console.log(
    "Checking for missing gnews.io files from the start of the year...",
  );

  const existingDates = getExistingDates();
  const datesToCheck = getDatesToCheck();

  const missingDates = datesToCheck.filter((date) => !existingDates.has(date));

  if (missingDates.length === 0) {
    console.log(
      "All news from the start of the year is up to date. Nothing to do.",
    );
    return;
  }

  console.log(
    `Found ${missingDates.length} missing day(s): ${missingDates.join(", ")}`,
  );
  console.log("Starting gnews.io backfill process...");

  // Fetch most recent missing dates first by reversing the list.
  for (const date of missingDates.reverse()) {
    try {
      // Adding a small delay to avoid hitting API rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await fetchNewsForDate(date);
    } catch (error) {
      // The error is already logged by fetchNewsForDate
      console.error(`Aborting backfill due to error on date: ${date}:`, error);
      process.exit(1);
    }
  }
};

backfillNews()
  .then(() => {
    console.log("gnews.io backfill process completed successfully.");
  })
  .catch((error) => {
    console.error(
      "An unexpected error occurred during the gnews.io backfill process:",
      error,
    );
    process.exit(1);
  });
