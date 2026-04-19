import { describe, it, expect } from "bun:test";
import { LLMService } from "./llm";

// Type-safe mock fetch
const createMockFetch = (responseBody: unknown) => {
  return async (_url: string | Request, _init?: RequestInit) => ({
    ok: true,
    json: async () => responseBody,
  } as Response);
};

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

    const mockFetch = createMockFetch({
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
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await service.parseEmail(email);
    expect(result.recipient.name).toBe("John Doe");
    expect(result.recipient.city).toBe("New York");
    expect(result.message).toBe("Happy Birthday!");
  });

  it("should throw on invalid JSON response", async () => {
    const service = new LLMService(mockConfig);

    const mockFetch = createMockFetch({
      choices: [{
        message: {
          content: "not valid json",
        },
      }],
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const email = {
      subject: "Fammail Postcard",
      text: "Some content",
      from: "sender@example.com",
    };

    await expect(service.parseEmail(email)).rejects.toThrow();
  });

  it("should throw on missing required fields", async () => {
    const service = new LLMService(mockConfig);

    const mockFetch = createMockFetch({
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
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const email = {
      subject: "Fammail Postcard",
      text: "Send to John",
      from: "sender@example.com",
    };

    await expect(service.parseEmail(email)).rejects.toThrow("Missing required field");
  });
});
