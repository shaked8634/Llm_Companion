import { describe, expect, it, vi } from "vitest";
import { createRequestFingerprint } from "@/lib/utils/request-fingerprint";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSettings: vi.fn(),
  createProvider: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  getTabSession: mocks.getSession,
  settingsStorage: { getValue: mocks.getSettings },
}));

vi.mock("@/lib/providers/factory", () => ({
  ProviderFactory: { create: mocks.createProvider },
}));

import { handleExecutePrompt } from "@/entrypoints/background/chat-handler";

describe("handleExecutePrompt", () => {
  it("reuses the last response before creating a provider", async () => {
    const userPrompt = "Summarize this page";
    const pageContext = JSON.stringify({
      content: "Same page",
      timestamp: "2026-07-24T09:00:00.000Z",
    });
    const lastRequestFingerprint = await createRequestFingerprint({
      userPrompt,
      pageContext,
      selectedModelId: "ollama:model",
      systemPrompt: "You are helpful.",
    });
    const session = {
      getValue: vi.fn().mockResolvedValue({
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: "Existing response" },
        ],
        isLoading: false,
        lastRequestFingerprint,
      }),
      setValue: vi.fn(),
    };

    mocks.getSession.mockReturnValue(session);
    mocks.getSettings.mockResolvedValue({
      selectedModelId: "ollama:model",
      systemPrompt: "You are helpful.",
    });

    await handleExecutePrompt(1, userPrompt, pageContext);

    expect(mocks.createProvider).not.toHaveBeenCalled();
    expect(session.setValue).not.toHaveBeenCalled();
  });
});
