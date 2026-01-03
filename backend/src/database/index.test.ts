import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "./index";
import { unlinkSync } from "fs";
import { join } from "path";

const TEST_DB = join(process.cwd(), "test.db");

describe("Database", () => {
  let db: Database;

  beforeEach(() => {
    try { unlinkSync(TEST_DB); } catch {}
    db = new Database(TEST_DB);
  });

  it("should create schema on initialization", () => {
    const tables = db.getTables();
    expect(tables).toContain("postcards");
    expect(tables).toContain("email_processing");
  });

  it("should insert and retrieve postcard record", () => {
    const id = "test-123";
    db.insertPostcard({
      id,
      emailMessageId: "msg-456",
      senderEmail: "test@example.com",
      recipientName: "John Doe",
      recipientAddress: "123 Main St",
      postgridMode: "test",
      forcedTestMode: false,
      status: "processing",
    });

    const card = db.getPostcard(id);
    expect(card?.id).toBe(id);
    expect(card?.status).toBe("processing");
  });

  it("should check if email was processed", () => {
    const msgId = "msg-123";
    expect(db.isEmailProcessed(msgId)).toBe(false);

    db.insertPostcard({
      id: "card-1",
      emailMessageId: msgId,
      senderEmail: "test@example.com",
      recipientName: "Jane Doe",
      recipientAddress: "456 Oak Ave",
      postgridMode: "test",
      forcedTestMode: false,
      status: "sent",
    });

    expect(db.isEmailProcessed(msgId)).toBe(true);
  });
});
