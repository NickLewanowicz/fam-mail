import { Database as SqliteDatabase } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Represents a postcard record in the database.
 */
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

/**
 * Database row interface for postcards table (raw SQLite types).
 */
interface PostcardRow {
  id: string;
  emailMessageId: string;
  senderEmail: string;
  recipientName: string;
  recipientAddress: string;
  postgridPostcardId: string | null;
  postgridMode: string;
  forcedTestMode: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Error thrown when database operations fail.
 */
export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * SQLite database wrapper for FamMail postcard operations.
 * Provides methods for managing postcard records and email processing status.
 */
export class Database {
  private db: SqliteDatabase;

  /**
   * Opens or creates the database at the specified path.
   * @param path - Filesystem path to the SQLite database file
   * @throws {DatabaseError} If the database cannot be opened
   */
  constructor(path: string) {
    try {
      this.db = new SqliteDatabase(path);
      this.initializeSchema();
    } catch (error) {
      throw new DatabaseError(`Failed to open database at ${path}`, error);
    }
  }

  /**
   * Initializes the database schema by executing schema.sql.
   * @private
   */
  private initializeSchema(): void {
    try {
      const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
      this.db.exec(schema);
    } catch (error) {
      throw new DatabaseError("Failed to initialize database schema", error);
    }
  }

  /**
   * Retrieves a list of all table names in the database.
   * @returns Array of table names
   */
  getTables(): string[] {
    const rows = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    return rows.map((r) => r.name);
  }

  /**
   * Inserts a new postcard record into the database.
   * @param data - Postcard data (excluding auto-managed timestamps)
   * @throws {DatabaseError} If constraint violation or other database error occurs
   */
  insertPostcard(data: Omit<PostcardRecord, "createdAt" | "updatedAt">): void {
    try {
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
        this.boolToInt(data.forcedTestMode),
        data.status,
        data.errorMessage || null
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to insert postcard with id ${data.id}`,
        error
      );
    }
  }

  /**
   * Retrieves a postcard record by ID.
   * @param id - Postcard ID
   * @returns Postcard record if found, undefined otherwise
   */
  getPostcard(id: string): PostcardRecord | undefined {
    const stmt = this.db.prepare("SELECT * FROM postcards WHERE id = ?");
    const row = stmt.get(id) as PostcardRow | undefined;
    if (!row) return undefined;
    return this.rowToPostcardRecord(row);
  }

  /**
   * Checks if an email has already been processed.
   * @param messageId - Email message ID to check
   * @returns true if the email has been processed, false otherwise
   */
  isEmailProcessed(messageId: string): boolean {
    const stmt = this.db.prepare(
      "SELECT 1 FROM postcards WHERE emailMessageId = ?"
    );
    return !!stmt.get(messageId);
  }

  /**
   * Updates the status of a postcard record.
   * @param id - Postcard ID
   * @param status - New status value
   * @param errorMessage - Optional error message (set to null to clear)
   * @throws {DatabaseError} If the postcard is not found or update fails
   */
  updatePostcardStatus(
    id: string,
    status: PostcardRecord["status"],
    errorMessage?: string
  ): void {
    try {
      const stmt = this.db.prepare(`
        UPDATE postcards
        SET status = ?, errorMessage = ?, updatedAt = datetime('now')
        WHERE id = ?
      `);
      stmt.run(status, errorMessage || null, id);
    } catch (error) {
      throw new DatabaseError(
        `Failed to update status for postcard ${id}`,
        error
      );
    }
  }

  /**
   * Closes the database connection.
   */
  close(): void {
    this.db.close();
  }

  /**
   * Converts a boolean to SQLite integer representation.
   * @private
   */
  private boolToInt(value: boolean): number {
    return value ? 1 : 0;
  }

  /**
   * Converts SQLite integer to boolean.
   * @private
   */
  private intToBool(value: number): boolean {
    return value === 1;
  }

  /**
   * Converts a raw database row to a PostcardRecord with proper types.
   * @private
   */
  private rowToPostcardRecord(row: PostcardRow): PostcardRecord {
    return {
      id: row.id,
      emailMessageId: row.emailMessageId,
      senderEmail: row.senderEmail,
      recipientName: row.recipientName,
      recipientAddress: row.recipientAddress,
      postgridPostcardId: row.postgridPostcardId || undefined,
      postgridMode: row.postgridMode as PostcardRecord["postgridMode"],
      forcedTestMode: this.intToBool(row.forcedTestMode),
      status: row.status as PostcardRecord["status"],
      errorMessage: row.errorMessage || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
