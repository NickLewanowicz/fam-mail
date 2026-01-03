import { describe, it, expect } from "bun:test";
import { getConfig } from "./config";

describe("Configuration", () => {
  it("should load valid config from environment", () => {
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

    const config = getConfig();
    expect(config.postgrid.mode).toBe("test");
    expect(config.postgrid.forceTestMode).toBe(false);
    expect(config.imap.host).toBe("imap.example.com");
  });

  it("should throw on missing required config", () => {
    delete process.env.POSTGRID_TEST_API_KEY;
    expect(() => getConfig()).toThrow("POSTGRID_TEST_API_KEY is required");
  });
});
