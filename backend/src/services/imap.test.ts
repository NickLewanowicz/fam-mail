import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { IMAPService } from "./imap";
import { Database } from "../database";
import { PostGridService } from "./postgrid";

describe("IMAP Service", () => {
  let db: Database;
  let postgrid: PostGridService;

  beforeEach(() => {
    db = new Database(":memory:");
    postgrid = new PostGridService("test-key", true);
  });

  afterEach(() => {
    db.close();
  });

  it("should filter emails by subject", () => {
    const imap = new IMAPService(
      { subjectFilter: "Fammail Postcard" } as any,
      db,
      {} as any,
      postgrid
    );

    expect(imap.matchesSubject("Fammail Postcard: Hello")).toBe(true);
    expect(imap.matchesSubject("RE: Fammail Postcard")).toBe(true);
    expect(imap.matchesSubject("Hello there")).toBe(false);
  });

  it("should check for image attachments", () => {
    const imap = new IMAPService(
      { requireImageAttachment: true } as any,
      db,
      {} as any,
      postgrid
    );

    expect(imap.hasImageAttachment([
      { filename: "photo.jpg", contentType: "image/jpeg" },
    ])).toBe(true);

    expect(imap.hasImageAttachment([
      { filename: "doc.pdf", contentType: "application/pdf" },
    ])).toBe(false);

    expect(imap.hasImageAttachment([])).toBe(false);
  });
});
