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

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`${key} is required`);
  }
  return value || defaultValue || "";
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === "true";
}

export function getConfig(): Config {
  return {
    postgrid: {
      mode: (getEnv("POSTGRID_MODE", "test") as "test" | "live") || "test",
      testApiKey: getEnv("POSTGRID_TEST_API_KEY"),
      liveApiKey: getEnv("POSTGRID_LIVE_API_KEY"),
      forceTestMode: getEnvBool("POSTGRID_FORCE_TEST_MODE", false),
      webhookSecret: getEnv("POSTGRID_WEBHOOK_SECRET", ""),
      size: (getEnv("POSTCARD_SIZE", "4x6") as "4x6" | "6x9") || "4x6",
      senderId: getEnv("POSTCARD_SENDER_ID", ""),
    },
    imap: {
      host: getEnv("IMAP_HOST"),
      port: getEnvInt("IMAP_PORT", 993),
      user: getEnv("IMAP_USER"),
      password: getEnv("IMAP_PASSWORD"),
      tls: getEnvBool("IMAP_TLS", true),
      inbox: getEnv("IMAP_INBOX", "INBOX"),
      subjectFilter: getEnv("SUBJECT_FILTER", "Fammail Postcard"),
      pollIntervalSeconds: getEnvInt("POLL_INTERVAL_SECONDS", 30),
      initialSyncDays: getEnvInt("INITIAL_SYNC_DAYS", 0),
      catchUpMode: (getEnv("CATCH_UP_MODE", "none") as "none" | "process" | "dry-run") || "none",
      requireImageAttachment: getEnvBool("REQUIRE_IMAGE_ATTACHMENT", true),
    },
    llm: {
      provider: (getEnv("LLM_PROVIDER", "openrouter") as "openrouter" | "ollama" | "custom") || "openrouter",
      apiKey: getEnv("LLM_API_KEY"),
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
      logLevel: (getEnv("LOG_LEVEL", "info") as "debug" | "info" | "warn" | "error") || "info",
    },
  };
}
