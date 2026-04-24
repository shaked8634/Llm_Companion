import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/preact";
import ChatInterface from "@/components/ChatInterface";
import * as useStorageModule from "@/hooks/useStorage";
import { defaultSettings } from "@/lib/store";

describe("ChatInterface prompt behavior", () => {
  const sendMessage = vi.fn();
  const sendTabMessage = vi.fn();

  beforeEach(() => {
    sendMessage.mockReset();
    sendTabMessage.mockReset();
    sendTabMessage.mockResolvedValue({
      success: true,
      payload: {
        title: "Test page",
        domain: "example.com",
        wordCount: 100,
      },
    });

    globalThis.chrome = {
      tabs: {
        query: vi.fn((_query, callback) => callback([{ id: 123 }])),
        sendMessage: sendTabMessage,
        onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
        onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
        getZoom: vi.fn((_id, callback) => callback(1)),
        onZoomChange: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      runtime: {
        sendMessage,
        openOptionsPage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      sidePanel: { open: vi.fn() },
    } as never;

    vi.spyOn(useStorageModule, "useStorage").mockImplementation(
      (storageItem: any) => {
        const key = storageItem?.key ?? "";
        const isSettings = typeof key === "string" && key.includes("settings");
        if (isSettings) {
          return [
            {
              ...defaultSettings,
              selectedModelId: "openrouter:model-1",
              discoveredModels: [
                {
                  id: "model-1",
                  name: "Model 1",
                  providerId: "openrouter",
                  providerName: "OpenRouter",
                },
              ],
              providers: {
                ...defaultSettings.providers,
                openrouter: { enabled: true, apiKey: "or-token" },
              },
            },
            vi.fn(),
          ] as const;
        }

        return [
          {
            messages: [],
            isLoading: false,
          },
          vi.fn(),
        ] as const;
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("hides selected-text prompts from the main prompt dropdown", () => {
    const { container } = render(<ChatInterface mode="popup" />);

    const promptSelect = container.querySelectorAll(
      "select",
    )[1] as HTMLSelectElement;
    const optionTexts = Array.from(promptSelect.options).map(
      (option) => option.text,
    );

    expect(optionTexts).not.toContain("Explain selected paragraph");
    expect(optionTexts).not.toContain("Translate Selected text");
    expect(optionTexts).toContain("Converse with the page");
  });

  it("shows input for Converse with the page and sends it together with page context", async () => {
    const { container } = render(<ChatInterface mode="popup" />);

    const promptSelect = container.querySelectorAll(
      "select",
    )[1] as HTMLSelectElement;
    fireEvent.change(promptSelect, {
      target: { value: "default-converse-with-page" },
    });

    const textarea = await screen.findByPlaceholderText(
      "Ask something about this page...",
    );
    fireEvent.input(textarea, {
      target: { value: "What is this page about?" },
    });

    fireEvent.click(
      container.querySelector('[title="Execute prompt"]') as HTMLButtonElement,
    );

    await waitFor(() => {
      expect(sendTabMessage).toHaveBeenCalledWith(123, {
        type: "SCRAPE_PAGE",
      });
      expect(sendMessage).toHaveBeenCalledWith({
        type: "EXECUTE_PROMPT",
        payload: expect.objectContaining({
          tabId: 123,
          userPrompt: expect.stringContaining("What is this page about?"),
        }),
      });
    });

    expect(
      (sendMessage.mock.calls[0]?.[0] as { payload?: { pageContext?: string } })
        .payload?.pageContext,
    ).toContain("example.com");
  });
});
