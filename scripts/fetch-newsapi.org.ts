import axios from "axios";
import * as fs from "fs";
import * as path from "path";

export async function fetchNewsForDate(
  newsDate: string,
  topic: string = "trump",
) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error("NEWS_API_KEY environment variable not set.");
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(newsDate)) {
    throw new Error(`Invalid date format: ${newsDate}. Please use YYYY-MM-DD.`);
  }

  const url = `https://newsapi.org/v2/everything?q=${topic}&language=en&from=${newsDate}&to=${newsDate}&sortBy=popularity&apiKey=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    const dataDir = path.join(__dirname, "..", "data", "news", "raw");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, `${newsDate}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(
      `Successfully fetched and saved news for ${newsDate} to ${filePath}`,
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `Error fetching news for ${newsDate}:`,
        error.response?.data || error.message,
      );
    } else {
      console.error(
        `An unexpected error occurred while fetching for ${newsDate}:`,
        error,
      );
    }
    // Re-throw the error so the caller can handle it
    throw error;
  }
}

// This block allows the script to be run directly from the command line
if (require.main === module) {
  const newsDateArg = process.argv[2];
  const topicArg = process.argv[3]; // Optional topic

  if (!newsDateArg) {
    console.error("Usage: ts-node scripts/fetch-news.ts <YYYY-MM-DD> [topic]");
    process.exit(1);
  }

  fetchNewsForDate(newsDateArg, topicArg).catch(() => {
    // The error is already logged inside the function
    process.exit(1);
  });
}

// This block allows the script to be run directly from the command line
if (require.main === module) {
  const newsDateArg = process.argv[2];
  const topicArg = process.argv[3]; // Optional topic

  if (!newsDateArg) {
    console.error("Usage: ts-node scripts/fetch-news.ts <YYYY-MM-DD> [topic]");
    process.exit(1);
  }

  fetchNewsForDate(newsDateArg, topicArg).catch(() => {
    // The error is already logged inside the function
    process.exit(1);
  });
}
