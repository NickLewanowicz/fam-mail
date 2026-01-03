import nodemailer from "nodemailer";

export interface NotificationConfig {
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  from: string;
}

export interface SuccessEmailData {
  to: string;
  recipientName: string;
  mode: "test" | "live";
  forcedTestMode: boolean;
  trackingUrl?: string;
}

export interface ErrorEmailData {
  to: string;
  error: string;
  originalSubject: string;
  originalBody: string;
}

export class NotificationService {
  private transporter?: nodemailer.Transporter;

  constructor(private config: NotificationConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  formatSuccessEmail(data: SuccessEmailData): { subject: string; text: string } {
    if (data.forcedTestMode) {
      return {
        subject: `Postcard to ${data.recipientName} created (TEST - force test enabled)`,
        text: `Your postcard to ${data.recipientName} was created in TEST mode (force test enabled). No physical postcard was sent.`,
      };
    }

    if (data.mode === "test") {
      return {
        subject: `Postcard to ${data.recipientName} created (TEST mode)`,
        text: `Your postcard to ${data.recipientName} was created in TEST mode. No physical postcard was sent.`,
      };
    }

    return {
      subject: `Postcard to ${data.recipientName} is on the way!`,
      text: `Your postcard to ${data.recipientName} has been sent and is on its way!${
        data.trackingUrl ? `\n\nTrack: ${data.trackingUrl}` : ""
      }`,
    };
  }

  formatErrorEmail(data: ErrorEmailData): { subject: string; text: string } {
    return {
      subject: "Couldn't send your postcard",
      text: `We couldn't send your postcard. Error: ${data.error}

---
Original email:
Subject: ${data.originalSubject}

${data.originalBody}`,
    };
  }

  async sendSuccessEmail(data: SuccessEmailData): Promise<void> {
    const email = this.formatSuccessEmail(data);
    await this.transporter!.sendMail({
      from: this.config.from,
      to: data.to,
      subject: email.subject,
      text: email.text,
    });
  }

  async sendErrorEmail(data: ErrorEmailData): Promise<void> {
    const email = this.formatErrorEmail(data);
    await this.transporter!.sendMail({
      from: this.config.from,
      to: data.to,
      subject: email.subject,
      text: email.text,
    });
  }
}
