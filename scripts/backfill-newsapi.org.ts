import fs from "fs";
import path from "path";
import { fetchNewsForDate } from "./fetch-newsapi.org";

const NEWS_DIR = path.join(__dirname, "..", "data", "news", "raw");

const getExistingDates = (): Set<string> => {
  try {
    const existingFiles = fs.readdirSync(NEWS_DIR);
    return new Set(existingFiles.map((file) => file.replace(".json", "")));
  } catch (error) {
    console.error(`Error reading news directory: ${NEWS_DIR}`);
    process.exit(1);
  }
};

const getDatesToCheck = (days: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  // Start from yesterday (i=1)
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split("T")[0];
    dates.push(dateString);
  }
  return dates;
};

const backfillNews = async () => {
  console.log("Checking for missing news files in the last 30 days...");

  const existingDates = getExistingDates();
  const datesToCheck = getDatesToCheck(30);

  const missingDates = datesToCheck.filter((date) => !existingDates.has(date));

  if (missingDates.length === 0) {
    console.log("All news for the last 30 days is up to date. Nothing to do.");
    return;
  }

  console.log(
    `Found ${missingDates.length} missing day(s): ${missingDates.join(", ")}`,
  );
  console.log("Starting backfill process...");

  // Fetch oldest missing dates first to keep the calendar chronological
  for (const date of missingDates.reverse()) {
    try {
      await fetchNewsForDate(date);
    } catch (error) {
      // The error is already logged by fetchNewsForDate
      console.error(`Aborting backfill due to error on date: ${date}.`);
      process.exit(1);
    }
  }

  console.log("Backfill process completed successfully.");
};

backfillNews().catch((error) => {
  console.error(
    "An unexpected error occurred during the backfill process:",
    error,
  );
  process.exit(1);
});
