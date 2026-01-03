import { describe, it, expect } from "bun:test";
import { NotificationService } from "./notifications";

describe("NotificationService", () => {
  it("should format success email for test mode", () => {
    const svc = new NotificationService({
      smtp: { host: "localhost", port: 1025, user: "test", password: "test" },
      from: "noreply@fammail.com",
    });
    const email = svc.formatSuccessEmail({
      to: "user@example.com",
      recipientName: "John Doe",
      mode: "test",
      forcedTestMode: false,
    });

    expect(email.subject).toContain("TEST mode");
    expect(email.text).toContain("No physical postcard was sent");
  });

  it("should format success email for live mode", () => {
    const svc = new NotificationService({
      smtp: { host: "localhost", port: 1025, user: "test", password: "test" },
      from: "noreply@fammail.com",
    });
    const email = svc.formatSuccessEmail({
      to: "user@example.com",
      recipientName: "John Doe",
      mode: "live",
      forcedTestMode: false,
    });

    expect(email.subject).toContain("on the way");
  });

  it("should format error email", () => {
    const svc = new NotificationService({
      smtp: { host: "localhost", port: 1025, user: "test", password: "test" },
      from: "noreply@fammail.com",
    });
    const email = svc.formatErrorEmail({
      to: "user@example.com",
      error: "Missing image attachment",
      originalSubject: "Fammail Postcard",
      originalBody: "Send this postcard",
    });

    expect(email.subject).toContain("Couldn't send");
    expect(email.text).toContain("Missing image attachment");
  });
});
