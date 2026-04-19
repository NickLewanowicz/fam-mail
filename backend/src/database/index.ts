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
  user_id?: string;
  draftId?: string;
  scheduledFor?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Database row interface for postcards table (raw SQLite types).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PostcardRow {
  id: string;
  email_message_id: string;
  sender_email: string;
  recipient_name: string;
  recipient_address: string;
  postgrid_postcard_id: string | null;
  postgrid_mode: string;
  forced_test_mode: number;
  status: string;
  error_message: string | null;
  user_id: string | null;
  draft_id: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row interface for users table (raw SQLite types).
 */
interface UserRow {
  id: string;
  oidc_sub: string;
  oidc_issuer: string;
  email: string;
  email_verified: number;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row interface for sessions table (raw SQLite types).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SessionRow {
  id: string;
  user_id: string;
  token: string;
  refresh_token: string | null;
  expires_at: string;
  createdAt: string;
}

/**
 * Database row interface for drafts table (raw SQLite types).
 */
interface DraftRow {
  id: string;
  user_id: string;
  recipient_address: string;
  sender_address: string | null;
  message: string | null;
  front_html: string | null;
  back_html: string | null;
  image_data: string | null;
  image_metadata: string | null;
  state: string;
  scheduled_for: string | null;
  size: string;
  created_at: string;
  updated_at: string;
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
          id, email_message_id, sender_email, recipient_name, recipient_address,
          postgrid_postcard_id, postgrid_mode, forced_test_mode, status, error_message,
          user_id, draft_id, scheduled_for
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        data.errorMessage || null,
        data.user_id || null,
        data.draftId || null,
        data.scheduledFor || null
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
      "SELECT 1 FROM postcards WHERE email_message_id = ?"
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
        SET status = ?, error_message = ?, updated_at = datetime('now')
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
      emailMessageId: row.email_message_id,
      senderEmail: row.sender_email,
      recipientName: row.recipient_name,
      recipientAddress: row.recipient_address,
      postgridPostcardId: row.postgrid_postcard_id || undefined,
      postgridMode: row.postgrid_mode as PostcardRecord["postgridMode"],
      forcedTestMode: this.intToBool(row.forced_test_mode),
      status: row.status as PostcardRecord["status"],
      errorMessage: row.error_message || undefined,
      user_id: row.user_id || undefined,
      draftId: row.draft_id || undefined,
      scheduledFor: row.scheduled_for || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // User Methods
  // ============================================================================

  /**
   * Retrieves a user by ID.
   * @param user_id - User ID
   * @returns User object if found, undefined otherwise
   */
  getUserById(user_id: string) {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
    const row = stmt.get(user_id) as UserRow | undefined;
    if (!row) return undefined;
    return this.rowToUser(row);
  }

  /**
   * Retrieves a user by OIDC subject and issuer.
   * @param oidcSub - OIDC subject
   * @param oidcIssuer - OIDC issuer
   * @returns User object if found, undefined otherwise
   */
  getUserByOidc(oidcSub: string, oidcIssuer: string) {
    const stmt = this.db.prepare("SELECT * FROM users WHERE oidc_sub = ? AND oidc_issuer = ?");
    const row = stmt.get(oidcSub, oidcIssuer) as UserRow | undefined;
    if (!row) return undefined;
    return this.rowToUser(row);
  }

  /**
   * Inserts a new user into the database.
   * @param data - User data
   * @throws {DatabaseError} If insertion fails
   */
  insertUser(data: {
    id: string;
    oidcSub: string;
    oidcIssuer: string;
    email: string;
    emailVerified?: boolean;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    createdAt?: string;
    updatedAt?: string;
  }): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (
          id, oidc_sub, oidc_issuer, email, email_verified,
          first_name, last_name, avatar_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        data.id,
        data.oidcSub,
        data.oidcIssuer,
        data.email,
        this.boolToInt(data.emailVerified ?? false),
        data.firstName || null,
        data.lastName || null,
        data.avatarUrl || null,
        data.createdAt || new Date().toISOString(),
        data.updatedAt || new Date().toISOString()
      );
    } catch (error) {
      throw new DatabaseError("Failed to insert user", error);
    }
  }

  /**
   * Updates a user with the provided data.
   * @param user_id - User ID
   * @param data - User data to update (partial updates supported)
   * @throws {DatabaseError} If update fails
   */
  updateUser(user_id: string, data: Partial<{
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    createdAt: string;
    updatedAt: string;
  }>): void {
    try {
      const fields: string[] = [];
      const values: (string | number | null)[] = [];
      if (data.email !== undefined) {
        fields.push("email = ?");
        values.push(data.email);
      }
      if (data.emailVerified !== undefined) {
        fields.push("email_verified = ?");
        values.push(this.boolToInt(data.emailVerified));
      }
      if (data.firstName !== undefined) {
        fields.push("first_name = ?");
        values.push(data.firstName);
      }
      if (data.lastName !== undefined) {
        fields.push("last_name = ?");
        values.push(data.lastName);
      }
      if (data.avatarUrl !== undefined) {
        fields.push("avatar_url = ?");
        values.push(data.avatarUrl);
      }

      if (fields.length === 0) {
        return; // No fields to update
      }

      // Always update updatedAt, using provided value or current timestamp
      if (data.updatedAt !== undefined) {
        fields.push("updated_at = ?");
        values.push(data.updatedAt);
      } else {
        fields.push("updated_at = datetime('now')");
      }

      values.push(user_id);

      const stmt = this.db.prepare(`
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = ?
      `);
      stmt.run(...values);
    } catch (error) {
      throw new DatabaseError("Failed to update user", error);
    }
  }

  /**
   * Converts a raw database row to a User object with proper types.
   * @private
   */
  private rowToUser(row: UserRow) {
    return {
      id: row.id,
      oidcSub: row.oidc_sub,
      oidcIssuer: row.oidc_issuer,
      email: row.email,
      emailVerified: this.intToBool(row.email_verified),
      firstName: row.first_name || undefined,
      lastName: row.last_name || undefined,
      avatarUrl: row.avatar_url || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // Session Methods
  // ============================================================================

  /**
   * Inserts a new session into the database.
   * @param data - Session data
   * @throws {DatabaseError} If insertion fails
   */
  insertSession(data: {
    id: string;
    userId?: string;
    user_id?: string;
    token: string;
    refreshToken?: string;
    refresh_token?: string;
    expiresAt?: string;
    expires_at?: string;
  }): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, user_id, token, refresh_token, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        data.id,
        data.userId || data.user_id,
        data.token,
        data.refreshToken || data.refresh_token || null,
        data.expiresAt || data.expires_at
      );
    } catch (error) {
      throw new DatabaseError("Failed to insert session", error);
    }
  }

  /**
   * Deletes a session by token.
   * @param token - Session token
   * @throws {DatabaseError} If deletion fails
   */
  deleteSession(token: string): void {
    try {
      const stmt = this.db.prepare("DELETE FROM sessions WHERE token = ?");
      stmt.run(token);
    } catch (error) {
      throw new DatabaseError("Failed to delete session", error);
    }
  }

  /**
   * Retrieves a session by its refresh token.
   * @param refreshToken - Refresh token to look up
   * @returns Session data if found, undefined otherwise
   */
  getSessionByRefreshToken(refreshToken: string): { id: string; userId: string; token: string; refreshToken: string | null; expiresAt: string } | undefined {
    const stmt = this.db.prepare("SELECT * FROM sessions WHERE refresh_token = ?");
    const row = stmt.get(refreshToken) as SessionRow | undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
    };
  }

  /**
   * Deletes all expired sessions (where expires_at < now).
   * Runs as a cleanup to prevent database bloat from unused refresh tokens.
   * @returns Number of deleted sessions
   */
  deleteExpiredSessions(): number {
    try {
      const stmt = this.db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')");
      const result = stmt.run();
      return result.changes;
    } catch (error) {
      throw new DatabaseError("Failed to delete expired sessions", error);
    }
  }

  /**
   * Deletes a session by its ID.
   * @param id - Session ID
   * @throws {DatabaseError} If deletion fails
   */
  deleteSessionById(id: string): void {
    try {
      const stmt = this.db.prepare("DELETE FROM sessions WHERE id = ?");
      stmt.run(id);
    } catch (error) {
      throw new DatabaseError("Failed to delete session by id", error);
    }
  }

  // ============================================================================
  // Draft Methods
  // ============================================================================

  /**
   * Retrieves all drafts for a user, optionally filtered by state.
   * @param user_id - User ID
   * @param state - Optional state filter ('draft' or 'ready')
   * @returns Array of draft objects
   */
  getDraftsByUserIdAndState(user_id: string, state: 'draft' | 'ready') {
    const stmt = this.db.prepare(`
      SELECT * FROM drafts
      WHERE user_id = ? AND state = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(user_id, state) as DraftRow[];
    return rows.map(row => this.rowToDraft(row));
  }

  /**
   * Retrieves all drafts for a user (any state).
   * @param user_id - User ID
   * @returns Array of draft objects
   */
  getDraftsByUserId(user_id: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM drafts
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(user_id) as DraftRow[];
    return rows.map(row => this.rowToDraft(row));
  }

  /**
   * Inserts a new draft into the database.
   * @param data - Draft data
   * @throws {DatabaseError} If insertion fails
   */
  insertDraft(data: {
    id: string;
    userId: string;
    recipientAddress: string | Record<string, unknown>;
    senderAddress?: string | Record<string, unknown>;
    message?: string;
    frontHTML?: string;
    backHTML?: string;
    imageData?: string;
    imageMetadata?: string | Record<string, unknown>;
    state?: 'draft' | 'ready';
    scheduledFor?: string;
    size?: '6x4' | '9x6' | '11x6';
  }): void {
    try {
      // Convert Address objects to JSON strings
      const recipientAddressStr = typeof data.recipientAddress === 'string'
        ? data.recipientAddress
        : JSON.stringify(data.recipientAddress);
      const senderAddressStr = data.senderAddress
        ? (typeof data.senderAddress === 'string' ? data.senderAddress : JSON.stringify(data.senderAddress))
        : null;
      const imageMetadataStr = data.imageMetadata
        ? (typeof data.imageMetadata === 'string' ? data.imageMetadata : JSON.stringify(data.imageMetadata))
        : null;

      const stmt = this.db.prepare(`
        INSERT INTO drafts (
          id, user_id, recipient_address, sender_address, message,
          front_html, back_html, image_data, image_metadata, state,
          scheduled_for, size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        data.id,
        data.userId,
        recipientAddressStr,
        senderAddressStr,
        data.message || null,
        data.frontHTML || null,
        data.backHTML || null,
        data.imageData || null,
        imageMetadataStr,
        data.state || 'draft',
        data.scheduledFor || null,
        data.size || '6x4'
      );
    } catch (error) {
      throw new DatabaseError("Failed to insert draft", error);
    }
  }

  /**
   * Retrieves a draft by ID.
   * @param id - Draft ID
   * @returns Draft object if found, undefined otherwise
   */
  getDraft(id: string) {
    const stmt = this.db.prepare("SELECT * FROM drafts WHERE id = ?");
    const row = stmt.get(id) as DraftRow | undefined;
    if (!row) return undefined;
    return this.rowToDraft(row);
  }

  /**
   * Updates a draft with the provided data.
   * @param id - Draft ID
   * @param data - Draft data to update (partial updates supported)
   * @throws {DatabaseError} If update fails
   */
  updateDraft(id: string, data: Partial<{
    recipientAddress: string | Record<string, unknown>;
    senderAddress: string | Record<string, unknown>;
    message: string;
    frontHTML: string;
    backHTML: string;
    imageData: string;
    imageMetadata: string | Record<string, unknown>;
    state: 'draft' | 'ready';
    scheduledFor: string;
    size: '6x4' | '9x6' | '11x6';
  }>): void {
    try {
      const fields: string[] = [];
      const values: (string | null)[] = [];

      if (data.recipientAddress !== undefined) {
        const recipientAddressStr = typeof data.recipientAddress === 'string'
          ? data.recipientAddress
          : JSON.stringify(data.recipientAddress);
        fields.push("recipient_address = ?");
        values.push(recipientAddressStr);
      }
      if (data.senderAddress !== undefined) {
        const senderAddressStr = typeof data.senderAddress === 'string'
          ? data.senderAddress
          : JSON.stringify(data.senderAddress);
        fields.push("sender_address = ?");
        values.push(senderAddressStr);
      }
      if (data.message !== undefined) {
        fields.push("message = ?");
        values.push(data.message);
      }
      if (data.frontHTML !== undefined) {
        fields.push("front_html = ?");
        values.push(data.frontHTML);
      }
      if (data.backHTML !== undefined) {
        fields.push("back_html = ?");
        values.push(data.backHTML);
      }
      if (data.imageData !== undefined) {
        fields.push("image_data = ?");
        values.push(data.imageData);
      }
      if (data.imageMetadata !== undefined) {
        const imageMetadataStr = typeof data.imageMetadata === 'string'
          ? data.imageMetadata
          : JSON.stringify(data.imageMetadata);
        fields.push("image_metadata = ?");
        values.push(imageMetadataStr);
      }
      if (data.state !== undefined) {
        fields.push("state = ?");
        values.push(data.state);
      }
      if (data.scheduledFor !== undefined) {
        fields.push("scheduled_for = ?");
        values.push(data.scheduledFor);
      }
      if (data.size !== undefined) {
        fields.push("size = ?");
        values.push(data.size);
      }

      if (fields.length === 0) {
        return; // No fields to update
      }

      fields.push("updated_at = datetime('now')");
      values.push(id);

      const stmt = this.db.prepare(`
        UPDATE drafts
        SET ${fields.join(', ')}
        WHERE id = ?
      `);
      stmt.run(...values);
    } catch (error) {
      throw new DatabaseError("Failed to update draft", error);
    }
  }

  /**
   * Deletes a draft by ID.
   * @param id - Draft ID
   * @throws {DatabaseError} If deletion fails
   */
  deleteDraft(id: string): void {
    try {
      const stmt = this.db.prepare("DELETE FROM drafts WHERE id = ?");
      stmt.run(id);
    } catch (error) {
      throw new DatabaseError("Failed to delete draft", error);
    }
  }

  /**
   * Converts a raw database row to a Draft object with proper types.
   * @private
   */
  private rowToDraft(row: DraftRow) {
    return {
      id: row.id,
      userId: row.user_id,
      recipientAddress: JSON.parse(row.recipient_address),
      senderAddress: row.sender_address ? JSON.parse(row.sender_address) : undefined,
      message: row.message || undefined,
      frontHTML: row.front_html || undefined,
      backHTML: row.back_html || undefined,
      imageData: row.image_data || undefined,
      imageMetadata: row.image_metadata ? JSON.parse(row.image_metadata) : undefined,
      state: row.state as 'draft' | 'ready',
      scheduledFor: row.scheduled_for || undefined,
      size: row.size as '6x4' | '9x6' | '11x6',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
