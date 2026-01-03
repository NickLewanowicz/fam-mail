import { ImapFlow } from "imapflow";
import { Database } from "../database";
import { LLMService } from "./llm";

interface IMAPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  inbox: string;
  subjectFilter: string;
  pollIntervalSeconds: number;
  initialSyncDays: number;
  catchUpMode: "none" | "process" | "dry-run";
  requireImageAttachment: boolean;
}

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
}

interface EmailMessage {
  id: string;
  uid: number;
  flags: string[];
  envelope: {
    from: { address: string }[];
    subject: string;
  };
  body?: {
    text: string;
    html: string;
  };
  attachments: EmailAttachment[];
}

export class IMAPService {
  private client?: ImapFlow;
  private pollTimer?: ReturnType<typeof setInterval>;
  private llm: LLMService;

  constructor(
    private config: IMAPConfig,
    private db: Database,
    llmConfig: Parameters<typeof LLMService.prototype>[0]
  ) {
    this.llm = new LLMService(llmConfig);
  }

  matchesSubject(subject: string): boolean {
    return subject.toLowerCase().includes(this.config.subjectFilter.toLowerCase());
  }

  hasImageAttachment(attachments: EmailAttachment[]): boolean {
    return attachments.some(a => a.contentType.startsWith("image/"));
  }

  async start(): Promise<void> {
    this.client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      tls: this.config.tls,
      logger: false,
    });

    await this.client.connect();
    console.log(`Connected to IMAP: ${this.config.host}`);

    await this.processInbox();
    this.startPolling();
  }

  async stop(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    if (this.client) {
      await this.client.logout();
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      this.processInbox().catch(console.error);
    }, this.config.pollIntervalSeconds * 1000);
  }

  private async processInbox(): Promise<void> {
    if (!this.client) return;

    const mailbox = await this.client.mailboxOpen(this.config.inbox);
    console.log(`Processing mailbox: ${this.config.inbox}, ${mailbox.exists} messages`);

    const since = new Date();
    since.setDate(since.getDate() - this.config.initialSyncDays);

    for await (const msg of this.client.fetch(
      since.getTime() > 0 ? { since } : "1:*",
      { envelope: true, bodySection: true, source: true }
    )) {
      await this.processMessage(msg as any);
    }
  }

  private async processMessage(msg: EmailMessage): Promise<void> {
    if (this.db.isEmailProcessed(msg.id)) {
      return;
    }

    if (!this.matchesSubject(msg.envelope.subject || "")) {
      return;
    }

    console.log(`Processing email: ${msg.id}`);

    if (this.config.requireImageAttachment && !this.hasImageAttachment(msg.attachments)) {
      console.log(`Skipping ${msg.id}: No image attachment`);
      return;
    }

    if (this.config.catchUpMode === "dry-run") {
      console.log(`Dry-run: Marking ${msg.id} as processed`);
      return;
    }

    try {
      const parsed = await this.llm.parseEmail({
        subject: msg.envelope.subject || "",
        text: msg.body?.text || "",
        html: msg.body?.html,
        from: msg.envelope.from[0]?.address || "",
      });

      console.log(`Parsed email for ${parsed.recipient.name}`);
      // TODO: Call PostGrid service with parsed data

    } catch (error) {
      console.error(`Error processing ${msg.id}:`, error);
    }
  }
}
