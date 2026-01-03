export interface ParsedEmail {
  recipient: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  message: string;
  imageReference?: string;
}

export interface EmailContent {
  subject: string;
  text: string;
  html?: string;
  from: string;
}

export interface LLMConfig {
  provider: "openrouter" | "ollama" | "custom";
  apiKey?: string;
  model: string;
  endpoint: string;
  maxTokens: number;
}

export class LLMService {
  constructor(private config: LLMConfig) {}

  async parseEmail(email: EmailContent): Promise<ParsedEmail> {
    const systemPrompt = `You are an email parsing assistant for a postcard service. Extract the recipient address and message from the email.

Return ONLY valid JSON in this exact format:
{
  "recipient": {
    "name": "string",
    "addressLine1": "string",
    "addressLine2": "string (optional)",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string (default US)"
  },
  "message": "string (plain text)",
  "imageReference": "string (optional, description of image if referenced)"
}`;

    const userPrompt = `Email subject: ${email.subject}\n\nFrom: ${email.from}\n\nBody:\n${email.text}`;

    const response = await this.callLLM(systemPrompt, userPrompt);
    const parsed = JSON.parse(response);

    // Validate required fields
    const required = ["name", "addressLine1", "city", "state", "zipCode"];
    for (const field of required) {
      if (!parsed.recipient[field]) {
        throw new Error(`Missing required field: recipient.${field}`);
      }
    }

    if (!parsed.message) {
      throw new Error("Missing required field: message");
    }

    return {
      recipient: {
        name: parsed.recipient.name,
        addressLine1: parsed.recipient.addressLine1,
        addressLine2: parsed.recipient.addressLine2,
        city: parsed.recipient.city,
        state: parsed.recipient.state,
        zipCode: parsed.recipient.zipCode,
        country: parsed.recipient.country || "US",
      },
      message: parsed.message,
      imageReference: parsed.imageReference,
    };
  }

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const body = {
      model: this.config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: this.config.maxTokens,
    };

    const response = await fetch(this.config.endpoint + "/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in LLM response");
    }

    return content;
  }
}
