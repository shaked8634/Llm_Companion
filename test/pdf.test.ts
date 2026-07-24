import { afterEach, describe, expect, it, vi } from "vitest";
import { getPdfAttachment, MAX_PDF_BYTES } from "@/lib/utils/pdf";
import { OpenAIProvider } from "@/lib/providers/openai";
import { GeminiProvider } from "@/lib/providers/gemini";
import { OpenRouterProvider } from "@/lib/providers/openrouter";

function streamResponse(data: string) {
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(data),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      }),
    },
  };
}

describe("PDF attachment", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads a PDF from the active tab without persisting it", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 test");
    vi.stubGlobal("chrome", {
      tabs: {
        get: vi.fn().mockResolvedValue({ url: "https://example.com/a.pdf" }),
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          "content-type": "application/pdf",
          "content-length": String(bytes.byteLength),
        }),
        arrayBuffer: vi.fn().mockResolvedValue(bytes.buffer),
      }),
    );

    await expect(getPdfAttachment(12, false)).resolves.toMatchObject({
      name: "a.pdf",
      mimeType: "application/pdf",
      base64: expect.stringMatching(/^JVBERi0/),
    });
  });

  it("rejects PDFs above the supported limit", async () => {
    vi.stubGlobal("chrome", {
      tabs: {
        get: vi.fn().mockResolvedValue({ url: "https://example.com/a.pdf" }),
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          "content-type": "application/pdf",
          "content-length": String(MAX_PDF_BYTES + 1),
        }),
      }),
    );

    await expect(getPdfAttachment(12, false)).rejects.toThrow(
      "PDF exceeds the 50 MB limit",
    );
  });
});

describe("native PDF provider requests", () => {
  const pdfAttachment = {
    name: "report.pdf",
    mimeType: "application/pdf" as const,
    base64: "JVBERi0=",
  };
  const messages = [{ role: "user" as const, content: "Summarize this." }];

  afterEach(() => vi.unstubAllGlobals());

  it("uses OpenAI Responses file input only for supported models", async () => {
    const provider = new OpenAIProvider({ apiKey: "key", enabled: true });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          streamResponse(
            'data: {"type":"response.output_text.delta","delta":"ok"}\n\n',
          ),
        ),
    );

    expect(provider.supportsPdf({ id: "gpt-4.1", name: "gpt-4.1" })).toBe(true);
    expect(provider.supportsPdf({ id: "gpt-3.5", name: "gpt-3.5" })).toBe(
      false,
    );
    await Array.fromAsync(
      provider.stream("gpt-4.1", messages, { pdfAttachment }),
    );

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(JSON.parse(init.body).input[0].content).toContainEqual(
      expect.objectContaining({
        type: "input_file",
        file_data: "data:application/pdf;base64,JVBERi0=",
      }),
    );
  });

  it("adds Gemini inline PDF data for supported models", async () => {
    const provider = new GeminiProvider({ apiKey: "key", enabled: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamResponse("data: {}\n\n")),
    );

    expect(
      provider.supportsPdf({ id: "gemini-2.5-flash", name: "Gemini" }),
    ).toBe(true);
    await Array.fromAsync(
      provider.stream("gemini-2.5-flash", messages, { pdfAttachment }),
    );

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body).contents[0].parts).toContainEqual({
      inlineData: { mimeType: "application/pdf", data: "JVBERi0=" },
    });
  });

  it("uses OpenRouter native file input only when model metadata allows it", async () => {
    const provider = new OpenRouterProvider({ apiKey: "key", enabled: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamResponse("data: [DONE]\n\n")),
    );

    expect(
      provider.supportsPdf({ id: "model", name: "Model", supportsPdf: true }),
    ).toBe(true);
    expect(provider.supportsPdf({ id: "model", name: "Model" })).toBe(false);
    await Array.fromAsync(
      provider.stream("model", messages, { pdfAttachment }),
    );

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body).messages[0].content).toContainEqual(
      expect.objectContaining({ type: "file" }),
    );
  });
});
