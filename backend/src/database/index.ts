import { Database as SqliteDatabase } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

export interface PostcardRecord {
  id: string;
  emailMessageId: string;
  senderEmail: string;
  recipientName: string;
  recipientAddress: string;
  postgridPostcardId?: string;
  postgridMode: "test" | "live";
  forcedTestMode: boolean;
  status: "processing" | "sent" | "delivered" | "failed" | "returned";
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class Database {
  private db: SqliteDatabase;

  constructor(path: string) {
    this.db = new SqliteDatabase(path);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    this.db.exec(schema);
  }

  getTables(): string[] {
    const rows = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    return rows.map(r => r.name);
  }

  insertPostcard(data: Omit<PostcardRecord, "createdAt" | "updatedAt">): void {
    const stmt = this.db.prepare(`
      INSERT INTO postcards (
        id, emailMessageId, senderEmail, recipientName, recipientAddress,
        postgridPostcardId, postgridMode, forcedTestMode, status, errorMessage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.emailMessageId,
      data.senderEmail,
      data.recipientName,
      data.recipientAddress,
      data.postgridPostcardId || null,
      data.postgridMode,
      data.forcedTestMode ? 1 : 0,
      data.status,
      data.errorMessage || null
    );
  }

  getPostcard(id: string): PostcardRecord | undefined {
    const stmt = this.db.prepare("SELECT * FROM postcards WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return undefined;
    return { ...row, forcedTestMode: !!row.forcedTestMode };
  }

  isEmailProcessed(messageId: string): boolean {
    const stmt = this.db.prepare("SELECT 1 FROM postcards WHERE emailMessageId = ?");
    return !!stmt.get(messageId);
  }

  updatePostcardStatus(id: string, status: PostcardRecord["status"], errorMessage?: string): void {
    const stmt = this.db.prepare(`
      UPDATE postcards
      SET status = ?, errorMessage = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);
    stmt.run(status, errorMessage || null, id);
  }

  close(): void {
    this.db.close();
  }
}
