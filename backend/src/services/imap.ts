import { ImapFlow } from "imapflow";
import { Database } from "../database";
import { LLMService } from "./llm";
import { PostGridService } from "./postgrid";
import type { PostGridPostcardRequest } from "../types/postgrid";

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
  private postgrid: PostGridService;

  constructor(
    private config: IMAPConfig,
    private db: Database,
    llmConfig: Parameters<typeof LLMService.prototype>[0],
    postgridService: PostGridService
  ) {
    this.llm = new LLMService(llmConfig);
    this.postgrid = postgridService;
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

      // Parse recipient name into first and last name
      const nameParts = parsed.recipient.name.trim().split(/\s+/);
      const firstName = nameParts[0] || parsed.recipient.name;
      const lastName = nameParts.slice(1).join(" ") || "";

      // Construct PostGrid request
      const postcardRequest: PostGridPostcardRequest = {
        to: {
          firstName,
          lastName,
          addressLine1: parsed.recipient.addressLine1,
          addressLine2: parsed.recipient.addressLine2,
          city: parsed.recipient.city,
          provinceOrState: parsed.recipient.state,
          postalOrZip: parsed.recipient.zipCode,
          countryCode: parsed.recipient.country,
        },
        backHTML: parsed.message,
      };

      // Call PostGrid API
      const postgridResult = await this.postgrid.createPostcard(postcardRequest);
      console.log(`Created PostGrid postcard: ${postgridResult.id}`);

      // Store result in database
      const postcardId = `pc_${msg.id}`;
      this.db.insertPostcard({
        id: postcardId,
        emailMessageId: msg.id,
        senderEmail: msg.envelope.from[0]?.address || "",
        recipientName: parsed.recipient.name,
        recipientAddress: JSON.stringify({
          addressLine1: parsed.recipient.addressLine1,
          addressLine2: parsed.recipient.addressLine2,
          city: parsed.recipient.city,
          state: parsed.recipient.state,
          zipCode: parsed.recipient.zipCode,
          country: parsed.recipient.country,
        }),
        postgridPostcardId: postgridResult.id,
        postgridMode: this.postgrid.getEffectiveMode(),
        forcedTestMode: this.postgrid.getTestMode(),
        status: "sent",
      });

    } catch (error) {
      console.error(`Error processing ${msg.id}:`, error);

      // Store failure in database
      try {
        const postcardId = `pc_${msg.id}`;
        this.db.insertPostcard({
          id: postcardId,
          emailMessageId: msg.id,
          senderEmail: msg.envelope.from[0]?.address || "",
          recipientName: "Unknown",
          recipientAddress: "{}",
          postgridMode: this.postgrid.getEffectiveMode(),
          forcedTestMode: this.postgrid.getTestMode(),
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } catch (dbError) {
        console.error(`Failed to store error for ${msg.id}:`, dbError);
      }
    }
  }
}
