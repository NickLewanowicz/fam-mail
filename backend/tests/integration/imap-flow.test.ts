import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "../../src/database";
import { IMAPService } from "../../src/services/imap";
import { PostGridService } from "../../src/services/postgrid";

describe("Email-to-Postcard Integration", () => {
  let db: Database;
  let postgrid: PostGridService;

  beforeAll(() => {
    db = new Database(":memory:");
    postgrid = new PostGridService({
      mode: "test",
      testApiKey: "test_key",
      liveApiKey: "live_key",
      forceTestMode: true,
      webhookSecret: "secret",
      size: "4x6",
      senderId: "sender_1",
    });
  });

  afterAll(() => {
    db.close();
  });

  test("should verify IMAP service methods", async () => {
    // Create IMAP service instance for testing
    const imapService = new IMAPService(
      {
        host: "imap.example.com",
        port: 993,
        user: "test@example.com",
        password: "password",
        tls: true,
        inbox: "INBOX",
        subjectFilter: "Fammail Postcard",
        pollIntervalSeconds: 60,
        initialSyncDays: 7,
        catchUpMode: "none",
        requireImageAttachment: true,
      },
      db,
      {
        provider: "openai",
        apiKey: "test-key",
        model: "gpt-4",
        endpoint: "https://api.openai.com/v1",
        maxTokens: 1000,
      },
      postgrid
    );

    // Test subject filter matching
    const matches = imapService.matchesSubject("Fammail Postcard: Hello");
    expect(matches).toBe(true);

    // Test subject filter non-matching
    const noMatch = imapService.matchesSubject("Regular Email");
    expect(noMatch).toBe(false);

    // Test image attachment detection
    const hasImage = imapService.hasImageAttachment([
      { filename: "photo.jpg", contentType: "image/jpeg", size: 1000 },
    ]);
    expect(hasImage).toBe(true);

    // Test no image attachment
    const noImage = imapService.hasImageAttachment([
      { filename: "doc.pdf", contentType: "application/pdf", size: 2000 },
    ]);
    expect(noImage).toBe(false);
  });

  test("should setup database and PostGrid service", async () => {
    // Verify database is initialized
    const tables = db.getTables();
    expect(tables).toContain("postcards");

    // Verify PostGrid service is in test mode
    expect(postgrid.getTestMode()).toBe(true);
    expect(postgrid.getEffectiveMode()).toBe("test");
  });
});
