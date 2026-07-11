export interface EnvConfig {
  PUBLIC_ALGOLIA_APP_ID: string;
  PUBLIC_ALGOLIA_API_KEY: string;
  PUBLIC_ALGOLIA_INDEX_NAME: string;
}

/**
 * Validates that all required client-side Algolia environment variables are present.
 * Throws an error listing any missing variables.
 *
 * This function should only be called where search functionality is needed
 * (e.g., the Search component), not at global build initialization.
 */
export function validateEnv(): EnvConfig {
  const required = [
    "PUBLIC_ALGOLIA_APP_ID",
    "PUBLIC_ALGOLIA_API_KEY",
    "PUBLIC_ALGOLIA_INDEX_NAME",
  ] as const;

  const missing = required.filter((k) => !import.meta.env[k]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    PUBLIC_ALGOLIA_APP_ID: import.meta.env.PUBLIC_ALGOLIA_APP_ID,
    PUBLIC_ALGOLIA_API_KEY: import.meta.env.PUBLIC_ALGOLIA_API_KEY,
    PUBLIC_ALGOLIA_INDEX_NAME: import.meta.env.PUBLIC_ALGOLIA_INDEX_NAME,
  };
}
