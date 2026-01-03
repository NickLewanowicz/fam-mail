/**
 * Application configuration schema
 */
export interface Config {
  postgrid: {
    mode: "test" | "live";
    testApiKey: string;
    liveApiKey: string;
    forceTestMode: boolean;
    webhookSecret: string;
    size: "4x6" | "6x9";
    senderId: string;
  };
  imap: {
    host: string;
    port: number;
    user: string;
    password: string;
    tls: boolean;
    inbox: string;
    subjectFilter: string;
    pollIntervalSeconds: number;
    initialSyncDays: number;
    catchUpMode: "none" | "process" | "dry-run";
    requireImageAttachment: boolean;
  };
  llm: {
    provider: "openrouter" | "ollama" | "custom";
    apiKey?: string;
    model: string;
    endpoint: string;
    maxTokens: number;
  };
  database: {
    path: string;
  };
  server: {
    port: number;
    nodeEnv: string;
    logLevel: "debug" | "info" | "warn" | "error";
  };
}

/**
 * Get required environment variable or throw error
 * @throws {Error} If environment variable is missing or empty
 */
function getEnvRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

/**
 * Get environment variable with default value
 * Empty string is treated as missing value
 */
function getEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value || defaultValue;
}

/**
 * Get environment variable as integer
 */
function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`${key} must be a valid integer`);
  }
  return parsed;
}

/**
 * Get environment variable as boolean
 */
function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  const normalized = value.toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`${key} must be either "true" or "false"`);
}

/**
 * Validate and get enum value from environment
 * @throws {Error} If value is not one of the allowed values
 */
function getEnvEnum<T extends string>(key: string, defaultValue: T, allowedValues: readonly T[]): T {
  const value = process.env[key];
  if (!value) return defaultValue;

  if (!allowedValues.includes(value as T)) {
    throw new Error(`${key} must be one of: ${allowedValues.join(", ")}`);
  }

  return value as T;
}

export function getConfig(): Config {
  return {
    postgrid: {
      mode: getEnvEnum("POSTGRID_MODE", "test", ["test", "live"] as const),
      testApiKey: getEnvRequired("POSTGRID_TEST_API_KEY"),
      liveApiKey: getEnvRequired("POSTGRID_LIVE_API_KEY"),
      forceTestMode: getEnvBool("POSTGRID_FORCE_TEST_MODE", false),
      webhookSecret: getEnv("POSTGRID_WEBHOOK_SECRET", ""),
      size: getEnvEnum("POSTCARD_SIZE", "4x6", ["4x6", "6x9"] as const),
      senderId: getEnv("POSTCARD_SENDER_ID", ""),
    },
    imap: {
      host: getEnvRequired("IMAP_HOST"),
      port: getEnvInt("IMAP_PORT", 993),
      user: getEnvRequired("IMAP_USER"),
      password: getEnvRequired("IMAP_PASSWORD"),
      tls: getEnvBool("IMAP_TLS", true),
      inbox: getEnv("IMAP_INBOX", "INBOX"),
      subjectFilter: getEnv("SUBJECT_FILTER", "Fammail Postcard"),
      pollIntervalSeconds: getEnvInt("POLL_INTERVAL_SECONDS", 30),
      initialSyncDays: getEnvInt("INITIAL_SYNC_DAYS", 0),
      catchUpMode: getEnvEnum("CATCH_UP_MODE", "none", ["none", "process", "dry-run"] as const),
      requireImageAttachment: getEnvBool("REQUIRE_IMAGE_ATTACHMENT", true),
    },
    llm: {
      provider: getEnvEnum("LLM_PROVIDER", "openrouter", ["openrouter", "ollama", "custom"] as const),
      apiKey: getEnv("LLM_API_KEY", ""),
      model: getEnv("LLM_MODEL", "openai/gpt-4o"),
      endpoint: getEnv("LLM_ENDPOINT", "https://openrouter.ai/api/v1"),
      maxTokens: getEnvInt("LLM_MAX_TOKENS", 1000),
    },
    database: {
      path: getEnv("DATABASE_PATH", "/data/fammail.db"),
    },
    server: {
      port: getEnvInt("PORT", 8484),
      nodeEnv: getEnv("NODE_ENV", "development"),
      logLevel: getEnvEnum("LOG_LEVEL", "info", ["debug", "info", "warn", "error"] as const),
    },
  };
}
