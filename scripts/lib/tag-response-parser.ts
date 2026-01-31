export function parseJsonArrayFromModelResponse(responseText: string): unknown[] {
  const original = responseText ?? "";
  let text = original.trim();

  if (text.length === 0) return [];

  const fenceMatch = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (fenceMatch?.[1]) {
    text = fenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
  }

  const arrayCandidate = extractFirstJsonArray(text);
  if (arrayCandidate) {
    try {
      const parsed = JSON.parse(arrayCandidate);
      if (Array.isArray(parsed)) return parsed;
    } catch {
    }
  }

  return [];
}

function extractFirstJsonArray(input: string): string | null {
  const start = input.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (ch === "\\") {
        isEscaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "[") depth++;
    if (ch === "]") depth--;

    if (depth === 0) {
      return input.slice(start, i + 1);
    }
  }

  return null;
}
