import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestFingerprint } from "@/lib/utils/request-fingerprint";
import type { ChatMessage } from "@/lib/providers/types";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSettings: vi.fn(),
  createProvider: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  getProviderSettingsWithDefaults: vi.fn(() => ({ ollama: {} })),
  getTabSession: mocks.getSession,
  settingsStorage: { getValue: mocks.getSettings },
}));

vi.mock("@/lib/providers/factory", () => ({
  ProviderFactory: { create: mocks.createProvider },
}));

vi.mock("@/lib/utils/pdf", () => ({
  getPdfAttachment: vi.fn().mockResolvedValue(undefined),
}));

import { handleExecutePrompt } from "@/entrypoints/background/chat-handler";

describe("handleExecutePrompt", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

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

  it("stores response metadata without sending it to the provider", async () => {
    let state: { messages: ChatMessage[]; isLoading: boolean } = {
      messages: [
        {
          role: "assistant" as const,
          content: "Earlier response",
          modelName: "Earlier Model",
          durationMs: 1000,
        },
      ],
      isLoading: false,
    };
    const session = {
      getValue: vi.fn(() => Promise.resolve(state)),
      setValue: vi.fn((nextState: typeof state) => {
        state = nextState;
        return Promise.resolve();
      }),
    };
    const stream = vi.fn(async function* () {
      yield "New response";
    });

    mocks.getSession.mockReturnValue(session);
    mocks.getSettings.mockResolvedValue({
      selectedModelId: "ollama:model",
      systemPrompt: "You are helpful.",
      responseTimeoutSeconds: 120,
    });
    mocks.createProvider.mockReturnValue({
      getModels: vi.fn().mockResolvedValue([{ id: "model", name: "Model 1" }]),
      stream,
    });

    await handleExecutePrompt(1, "Summarize this page", "page context");

    expect(stream).toHaveBeenCalledWith(
      "model",
      expect.arrayContaining([
        { role: "assistant", content: "Earlier response" },
      ]),
      { pdfAttachment: undefined },
    );
    expect(state.messages.at(-1)).toMatchObject({
      role: "assistant",
      content: "New response",
      modelName: "Model 1",
      durationMs: expect.any(Number),
    });
  });
});
