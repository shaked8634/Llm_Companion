import { describe, expect, it, vi, beforeEach } from "vitest";
import { OpenRouterProvider } from "@/lib/providers/openrouter";
import { CustomProvider } from "../src/lib/providers/custom";

describe("OpenRouterProvider detail", () => {
  const apiKey = "test-api-key";
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider({ apiKey, enabled: true });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("getModels should call OpenRouter API with correct headers", async () => {
    const mockModels = {
      data: [{ id: "model-1", name: "Model 1", context_length: 4096 }],
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockModels),
    });

    const models = await provider.getModels();

    expect(fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/models",
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }),
    );
    expect(models).toHaveLength(1);
    expect(models[0]).toEqual({
      id: "model-1",
      name: "Model 1",
      contextLength: 4096,
    });
  });

  it("stream should send correct request body and headers", async () => {
    const model = "test-model";
    const messages = [{ role: "user" as const, content: "hello" }];

    // Mock for a single chunk of SSE
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\n',
              ),
            })
            .mockResolvedValueOnce({ done: true }),
          releaseLock: vi.fn(),
        }),
      },
    };

    (fetch as any).mockResolvedValue(mockResponse);

    const generator = provider.stream(model, messages);
    const chunks = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(fetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "LLM Companion",
        }),
      }),
    );

    const callBody = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(callBody.model).toBe(model);
    expect(callBody.stream).toBe(true);
    expect(chunks).toEqual(["hi"]);
  });
});

describe("CustomProvider detail", () => {
  const apiKey = "test-api-key";
  const url = "https://custom.api/v1";
  let provider: CustomProvider;

  beforeEach(() => {
    provider = new CustomProvider({ url, apiKey, enabled: true });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("getModels should call custom URL with correct headers", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: "custom-model" }] }),
    });

    await provider.getModels();

    expect(fetch).toHaveBeenCalledWith(
      `${url}/models`,
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }),
    );
  });

  it("stream should use custom URL and send correct body", async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"custom-hi"}}]}\n\ndata: [DONE]\n\n',
              ),
            })
            .mockResolvedValueOnce({ done: true }),
          releaseLock: vi.fn(),
        }),
      },
    };

    (fetch as any).mockResolvedValue(mockResponse);

    const generator = provider.stream("m1", [{ role: "user", content: "h" }]);
    const chunks = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(fetch).toHaveBeenCalledWith(
      `${url}/chat/completions`,
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(chunks).toEqual(["custom-hi"]);
  });
});
