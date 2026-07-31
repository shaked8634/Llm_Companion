import { describe, expect, it } from "vitest";
import { createRequestFingerprint } from "@/lib/utils/request-fingerprint";

describe("createRequestFingerprint", () => {
  const request = {
    userPrompt: "Summarize this page",
    selectedModelId: "ollama:model",
    systemPrompt: "You are helpful.",
  };

  it("ignores scraper capture timestamps", async () => {
    const first = await createRequestFingerprint({
      ...request,
      pageContext: JSON.stringify({
        url: "https://example.com",
        content: "Same page",
        timestamp: "2026-07-24T09:00:00.000Z",
      }),
    });
    const second = await createRequestFingerprint({
      ...request,
      pageContext: JSON.stringify({
        url: "https://example.com",
        content: "Same page",
        timestamp: "2026-07-24T09:01:00.000Z",
      }),
    });

    expect(second).toBe(first);
  });

  it("changes when the page or prompt changes", async () => {
    const original = await createRequestFingerprint({
      ...request,
      pageContext: JSON.stringify({ content: "Original", timestamp: "now" }),
    });
    const changedPage = await createRequestFingerprint({
      ...request,
      pageContext: JSON.stringify({ content: "Changed", timestamp: "now" }),
    });
    const changedPrompt = await createRequestFingerprint({
      ...request,
      userPrompt: "Explain this page",
      pageContext: JSON.stringify({ content: "Original", timestamp: "now" }),
    });

    expect(changedPage).not.toBe(original);
    expect(changedPrompt).not.toBe(original);
  });
});
