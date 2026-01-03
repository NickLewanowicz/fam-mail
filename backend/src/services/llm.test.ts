import { describe, it, expect } from "bun:test";
import { LLMService } from "./llm";

describe("LLM Service", () => {
  const mockConfig = {
    provider: "openrouter" as const,
    apiKey: "test-key",
    model: "openai/gpt-4o",
    endpoint: "https://api.test.com",
    maxTokens: 1000,
  };

  it("should parse email with valid address and message", async () => {
    const service = new LLMService(mockConfig);
    const email = {
      subject: "Fammail Postcard",
      text: "Send to: John Doe\n123 Main St\nNew York, NY 10001\n\nHappy Birthday!",
      from: "sender@example.com",
    };

    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              recipient: {
                name: "John Doe",
                addressLine1: "123 Main St",
                city: "New York",
                state: "NY",
                zipCode: "10001",
                country: "US",
              },
              message: "Happy Birthday!",
            }),
          },
        }],
      }),
    }) as Response;

    const result = await service.parseEmail(email);
    expect(result.recipient.name).toBe("John Doe");
    expect(result.recipient.city).toBe("New York");
    expect(result.message).toBe("Happy Birthday!");
  });

  it("should throw on invalid JSON response", async () => {
    const service = new LLMService(mockConfig);

    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: "not valid json",
          },
        }],
      }),
    }) as Response;

    const email = {
      subject: "Fammail Postcard",
      text: "Some content",
      from: "sender@example.com",
    };

    await expect(service.parseEmail(email)).rejects.toThrow();
  });

  it("should throw on missing required fields", async () => {
    const service = new LLMService(mockConfig);

    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              recipient: {
                name: "John",
                // missing required address fields
              },
            }),
          },
        }],
      }),
    }) as Response;

    const email = {
      subject: "Fammail Postcard",
      text: "Send to John",
      from: "sender@example.com",
    };

    await expect(service.parseEmail(email)).rejects.toThrow("Missing required field");
  });
});
