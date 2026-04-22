/**
 * Application configuration schema
 */
export interface Config {
  devMode: boolean;
  postgrid: {
    mode: "test" | "live";
    testApiKey: string;
    liveApiKey: string;
    forceTestMode: boolean;
    mockMode: boolean;
    webhookSecret: string;
    size: "6x4" | "9x6";
    senderId: string;
  };
  oidc: {
    issuerUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
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
  } | null;
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
    allowedOrigins: string[];
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

/** Minimum JWT secret length for HS256 (prevents brute-force attacks) */
const JWT_SECRET_MIN_LENGTH = 32;

/**
 * Get and validate the JWT secret.
 * Must be at least 32 characters for HS256 security.
 * Rotatable by simply changing the env var and restarting.
 * @throws {Error} If secret is missing or too short
 */
function getJwtSecret(): string {
  const secret = getEnvRequired("JWT_SECRET");
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters (got ${secret.length}). ` +
      `Generate with: openssl rand -base64 48`
    );
  }
  return secret;
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
  const isMock = getEnvBool("POSTGRID_MOCK", false);
  const devMode = getEnvBool("DEV_MODE", false);

  return {
    devMode,
    postgrid: {
      mode: getEnvEnum("POSTGRID_MODE", "test", ["test", "live"] as const),
      testApiKey: isMock ? getEnv("POSTGRID_TEST_API_KEY", "mock-test-key") : getEnvRequired("POSTGRID_TEST_API_KEY"),
      liveApiKey: isMock ? getEnv("POSTGRID_LIVE_API_KEY", "mock-live-key") : getEnvRequired("POSTGRID_LIVE_API_KEY"),
      forceTestMode: getEnvBool("POSTGRID_FORCE_TEST_MODE", false),
      mockMode: isMock,
      webhookSecret: getEnv("POSTGRID_WEBHOOK_SECRET", ""),
      size: getEnvEnum("POSTCARD_SIZE", "6x4", ["6x4", "9x6"] as const),
      senderId: getEnv("POSTCARD_SENDER_ID", ""),
    },
    oidc: {
      issuerUrl: devMode ? getEnv("OIDC_ISSUER_URL", "https://dev.example.com") : getEnvRequired("OIDC_ISSUER_URL"),
      clientId: devMode ? getEnv("OIDC_CLIENT_ID", "dev-client") : getEnvRequired("OIDC_CLIENT_ID"),
      clientSecret: devMode ? getEnv("OIDC_CLIENT_SECRET", "dev-secret") : getEnvRequired("OIDC_CLIENT_SECRET"),
      redirectUri: devMode ? getEnv("OIDC_REDIRECT_URI", "http://localhost:8484/api/auth/callback") : getEnvRequired("OIDC_REDIRECT_URI"),
      scopes: getEnv("OIDC_SCOPES", "openid profile email"),
    },
    jwt: {
      secret: devMode ? getEnv("JWT_SECRET", "dev-mode-jwt-secret-minimum-32-characters-long") : getJwtSecret(),
      expiresIn: getEnv("JWT_EXPIRES_IN", "7d"),
      refreshExpiresIn: getEnv("JWT_REFRESH_EXPIRES_IN", "30d"),
    },
    imap: process.env.IMAP_HOST
      ? {
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
        }
      : null,
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
      allowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173").split(",").map((s: string) => s.trim()),
    },
  };
}
