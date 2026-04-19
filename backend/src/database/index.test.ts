import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "./index";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_DB = join(tmpdir(), `fammail-test-${Date.now()}.db`);

describe("Database", () => {
  let db: Database;

  beforeEach(() => {
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
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
    expect(card?.forcedTestMode).toBe(false);
  });

  it("should correctly serialize boolean values", () => {
    const id1 = "card-true";
    const id2 = "card-false";

    db.insertPostcard({
      id: id1,
      emailMessageId: "msg-1",
      senderEmail: "test@example.com",
      recipientName: "Test User",
      recipientAddress: "123 Test St",
      postgridMode: "live",
      forcedTestMode: true,
      status: "processing",
    });

    db.insertPostcard({
      id: id2,
      emailMessageId: "msg-2",
      senderEmail: "test@example.com",
      recipientName: "Test User",
      recipientAddress: "123 Test St",
      postgridMode: "test",
      forcedTestMode: false,
      status: "processing",
    });

    const card1 = db.getPostcard(id1);
    const card2 = db.getPostcard(id2);

    expect(card1?.forcedTestMode).toBe(true);
    expect(card2?.forcedTestMode).toBe(false);
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

  it("should update postcard status", () => {
    const id = "card-update";
    db.insertPostcard({
      id,
      emailMessageId: "msg-update",
      senderEmail: "test@example.com",
      recipientName: "Test User",
      recipientAddress: "123 Test St",
      postgridMode: "test",
      forcedTestMode: false,
      status: "processing",
    });

    const beforeCard = db.getPostcard(id);
    expect(beforeCard?.status).toBe("processing");

    db.updatePostcardStatus(id, "sent");

    const afterCard = db.getPostcard(id);
    expect(afterCard?.status).toBe("sent");
    expect(afterCard?.updatedAt).toBeDefined();
    expect(afterCard?.createdAt).toBe(beforeCard?.createdAt);
  });

  it("should update postcard status with error message", () => {
    const id = "card-error";
    db.insertPostcard({
      id,
      emailMessageId: "msg-error",
      senderEmail: "test@example.com",
      recipientName: "Test User",
      recipientAddress: "123 Test St",
      postgridMode: "test",
      forcedTestMode: false,
      status: "processing",
    });

    const errorMsg = "Invalid address";
    db.updatePostcardStatus(id, "failed", errorMsg);

    const card = db.getPostcard(id);
    expect(card?.status).toBe("failed");
    expect(card?.errorMessage).toBe(errorMsg);
  });

  it("should return undefined for non-existent postcard", () => {
    const card = db.getPostcard("non-existent");
    expect(card).toBeUndefined();
  });

  it("should handle optional fields correctly", () => {
    const id = "card-optional";
    db.insertPostcard({
      id,
      emailMessageId: "msg-optional",
      senderEmail: "test@example.com",
      recipientName: "Test User",
      recipientAddress: "123 Test St",
      postgridMode: "test",
      forcedTestMode: false,
      status: "processing",
    });

    const card = db.getPostcard(id);
    expect(card?.postgridPostcardId).toBeUndefined();
    expect(card?.errorMessage).toBeUndefined();
  });

  it("should handle postgridPostcardId and errorMessage", () => {
    const id = "card-with-optional";
    db.insertPostcard({
      id,
      emailMessageId: "msg-with-optional",
      senderEmail: "test@example.com",
      recipientName: "Test User",
      recipientAddress: "123 Test St",
      postgridPostcardId: "pg-123",
      postgridMode: "live",
      forcedTestMode: false,
      status: "sent",
      errorMessage: "Some warning",
    });

    const card = db.getPostcard(id);
    expect(card?.postgridPostcardId).toBe("pg-123");
    expect(card?.errorMessage).toBe("Some warning");
  });
});

describe("Database - Session methods", () => {
  let db: Database;

  beforeEach(() => {
    const testDb = join(tmpdir(), `fammail-session-test-${Date.now()}.db`);
    db = new Database(testDb);
  });

  it("should insert and find session by refresh token", () => {
    // Insert a user first (foreign key constraint)
    db.insertUser({
      id: "user-1",
      oidcSub: "sub-1",
      oidcIssuer: "https://example.com",
      email: "test@example.com",
    });

    db.insertSession({
      id: "session-1",
      userId: "user-1",
      token: "access-token-1",
      refreshToken: "refresh-token-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const session = db.getSessionByRefreshToken("refresh-token-1");
    expect(session).toBeDefined();
    expect(session!.userId).toBe("user-1");
    expect(session!.token).toBe("access-token-1");
    expect(session!.refreshToken).toBe("refresh-token-1");
  });

  it("should return undefined for non-existent refresh token", () => {
    const session = db.getSessionByRefreshToken("non-existent");
    expect(session).toBeUndefined();
  });

  it("should delete session by id", () => {
    db.insertUser({
      id: "user-2",
      oidcSub: "sub-2",
      oidcIssuer: "https://example.com",
      email: "user2@example.com",
    });

    db.insertSession({
      id: "session-2",
      userId: "user-2",
      token: "access-token-2",
      refreshToken: "refresh-token-2",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Verify session exists
    const session = db.getSessionByRefreshToken("refresh-token-2");
    expect(session).toBeDefined();

    // Delete session
    db.deleteSessionById("session-2");

    // Verify session is gone
    const deletedSession = db.getSessionByRefreshToken("refresh-token-2");
    expect(deletedSession).toBeUndefined();
  });

  it("should delete expired sessions", () => {
    db.insertUser({
      id: "user-3",
      oidcSub: "sub-3",
      oidcIssuer: "https://example.com",
      email: "user3@example.com",
    });

    // Insert an already-expired session (expires_at far in the past)
    db.insertSession({
      id: "session-expired",
      userId: "user-3",
      token: "expired-access-token",
      refreshToken: "expired-refresh-token",
      expiresAt: "2000-01-01T00:00:00.000Z",
    });

    // Insert a valid session (far in the future)
    db.insertSession({
      id: "session-valid",
      userId: "user-3",
      token: "valid-access-token",
      refreshToken: "valid-refresh-token",
      expiresAt: "2099-12-31T23:59:59.000Z",
    });

    const deletedCount = db.deleteExpiredSessions();
    expect(deletedCount).toBe(1);

    // Expired session should be gone
    expect(db.getSessionByRefreshToken("expired-refresh-token")).toBeUndefined();
    // Valid session should remain
    expect(db.getSessionByRefreshToken("valid-refresh-token")).toBeDefined();
  });

  it("deleteExpiredSessions returns 0 when no expired sessions", () => {
    db.insertUser({
      id: "user-4",
      oidcSub: "sub-4",
      oidcIssuer: "https://example.com",
      email: "user4@example.com",
    });

    db.insertSession({
      id: "session-future",
      userId: "user-4",
      token: "future-access-token",
      refreshToken: "future-refresh-token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const deletedCount = db.deleteExpiredSessions();
    expect(deletedCount).toBe(0);
  });
});
