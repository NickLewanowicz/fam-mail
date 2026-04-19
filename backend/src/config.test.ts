import { describe, it, expect, afterEach } from "bun:test";
import { getConfig } from "./config";

describe("Configuration", () => {
  // Clean up IMAP env vars after each test to avoid cross-contamination
  afterEach(() => {
    delete process.env.IMAP_HOST;
    delete process.env.IMAP_PORT;
    delete process.env.IMAP_USER;
    delete process.env.IMAP_PASSWORD;
  });

  it("should load valid config from environment with IMAP configured", () => {
    process.env.POSTGRID_MODE = "test";
    process.env.POSTGRID_TEST_API_KEY = "pg_test_123";
    process.env.POSTGRID_LIVE_API_KEY = "pg_live_456";
    process.env.POSTGRID_FORCE_TEST_MODE = "false";
    process.env.IMAP_HOST = "imap.example.com";
    process.env.IMAP_PORT = "993";
    process.env.IMAP_USER = "test@example.com";
    process.env.IMAP_PASSWORD = "password";
    process.env.SUBJECT_FILTER = "Fammail Postcard";
    process.env.LLM_PROVIDER = "openrouter";
    process.env.LLM_API_KEY = "sk-123";
    process.env.LLM_MODEL = "openai/gpt-4o";
    process.env.DATABASE_PATH = "/data/fammail.db";
    process.env.PORT = "8484";
    process.env.OIDC_ISSUER_URL = "https://accounts.google.com";
    process.env.OIDC_CLIENT_ID = "test-client-id";
    process.env.OIDC_CLIENT_SECRET = "test-client-secret";
    process.env.OIDC_REDIRECT_URI = "http://localhost:8484/api/auth/callback";
    process.env.JWT_SECRET = "test-secret-key-minimum-32-characters-long";

    const config = getConfig();
    expect(config.postgrid.mode).toBe("test");
    expect(config.postgrid.forceTestMode).toBe(false);
    expect(config.imap).toBeDefined();
    expect(config.imap!.host).toBe("imap.example.com");
  });

  it("should load config without IMAP env vars (IMAP paused for beta)", () => {
    process.env.POSTGRID_MODE = "test";
    process.env.POSTGRID_TEST_API_KEY = "pg_test_123";
    process.env.POSTGRID_LIVE_API_KEY = "pg_live_456";
    process.env.POSTGRID_FORCE_TEST_MODE = "false";
    // No IMAP vars set — IMAP is paused for beta
    delete process.env.IMAP_HOST;
    delete process.env.IMAP_PORT;
    delete process.env.IMAP_USER;
    delete process.env.IMAP_PASSWORD;
    process.env.LLM_PROVIDER = "openrouter";
    process.env.LLM_API_KEY = "sk-123";
    process.env.LLM_MODEL = "openai/gpt-4o";
    process.env.DATABASE_PATH = "/data/fammail.db";
    process.env.PORT = "8484";
    process.env.OIDC_ISSUER_URL = "https://accounts.google.com";
    process.env.OIDC_CLIENT_ID = "test-client-id";
    process.env.OIDC_CLIENT_SECRET = "test-client-secret";
    process.env.OIDC_REDIRECT_URI = "http://localhost:8484/api/auth/callback";
    process.env.JWT_SECRET = "test-secret-key-minimum-32-characters-long";

    const config = getConfig();
    expect(config.postgrid.mode).toBe("test");
    expect(config.imap).toBeNull();
  });

  it("should throw on missing required config", () => {
    delete process.env.POSTGRID_TEST_API_KEY;
    expect(() => getConfig()).toThrow("POSTGRID_TEST_API_KEY is required");
  });

  it("should require IMAP_USER when IMAP_HOST is set (#18)", () => {
    process.env.POSTGRID_MODE = "test";
    process.env.POSTGRID_TEST_API_KEY = "pg_test_123";
    process.env.POSTGRID_LIVE_API_KEY = "pg_live_456";
    process.env.POSTGRID_FORCE_TEST_MODE = "false";
    process.env.IMAP_HOST = "imap.example.com";
    process.env.IMAP_PORT = "993";
    // IMAP_USER and IMAP_PASSWORD intentionally omitted
    delete process.env.IMAP_USER;
    delete process.env.IMAP_PASSWORD;
    process.env.LLM_PROVIDER = "openrouter";
    process.env.LLM_API_KEY = "sk-123";
    process.env.LLM_MODEL = "openai/gpt-4o";
    process.env.DATABASE_PATH = "/data/fammail.db";
    process.env.PORT = "8484";
    process.env.OIDC_ISSUER_URL = "https://accounts.google.com";
    process.env.OIDC_CLIENT_ID = "test-client-id";
    process.env.OIDC_CLIENT_SECRET = "test-client-secret";
    process.env.OIDC_REDIRECT_URI = "http://localhost:8484/api/auth/callback";
    process.env.JWT_SECRET = "test-secret-key-minimum-32-characters-long";

    expect(() => getConfig()).toThrow("IMAP_USER is required");
  });

  it("should start server with minimal config (no IMAP, no LLM key) (#18)", () => {
    // This is the exact config needed for the web UI postcard flow in beta.
    // No IMAP vars, no LLM key — only PostGrid, OIDC, JWT, and database.
    process.env.POSTGRID_MODE = "test";
    process.env.POSTGRID_TEST_API_KEY = "pg_test_min";
    process.env.POSTGRID_LIVE_API_KEY = "pg_live_min";
    process.env.JWT_SECRET = "test-secret-key-minimum-32-characters-long";
    process.env.OIDC_ISSUER_URL = "https://accounts.google.com";
    process.env.OIDC_CLIENT_ID = "minimal-client";
    process.env.OIDC_CLIENT_SECRET = "minimal-secret";
    process.env.OIDC_REDIRECT_URI = "http://localhost:8484/api/auth/callback";
    // Explicitly ensure no IMAP
    delete process.env.IMAP_HOST;
    delete process.env.IMAP_USER;
    delete process.env.IMAP_PASSWORD;

    const config = getConfig();
    expect(config.imap).toBeNull();
    expect(config.postgrid.mode).toBe("test");
    expect(config.jwt.secret).toBe("test-secret-key-minimum-32-characters-long");
    expect(config.oidc.clientId).toBe("minimal-client");
  });
});
