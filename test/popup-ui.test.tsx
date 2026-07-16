import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import App from "../src/entrypoints/popup/App";
import * as useStorageModule from "../src/hooks/useStorage";
import { defaultSettings } from "@/lib/store";

describe("Popup UI", () => {
  let zoomListener:
    | ((info: { tabId: number; newZoomFactor: number }) => void)
    | undefined;

  beforeEach(() => {
    // Mock chrome.tabs.query
    HTMLElement.prototype.scrollIntoView = vi.fn();
    globalThis.chrome = {
      tabs: {
        query: vi.fn((query, callback) => {
          callback([{ id: 1 }]);
        }),
        onActivated: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        onUpdated: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        getZoom: vi.fn((tabId, callback) => {
          callback(1.5);
        }),
        onZoomChange: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      runtime: {
        openOptionsPage: vi.fn(),
        sendMessage: vi.fn(),
      },
      sidePanel: {
        open: vi.fn(),
      },
    } as any;

    // Mock useStorage hook to return mock data
    vi.spyOn(useStorageModule, "useStorage").mockImplementation(
      (storageItem) => {
        // First call is for settings, second is for session
        if (storageItem === null) {
          return [null, vi.fn()] as const;
        }

        // Check if this is the settings storage by checking the key structure
        const isSetting = storageItem?.key?.includes?.("settings");

        if (isSetting) {
          // Return mock settings
          return [
            {
              ...defaultSettings,
              selectedModelId: "ollama:test-model",
              discoveredModels: [
                {
                  id: "test-model",
                  name: "Test Model",
                  providerId: "ollama",
                  providerName: "Ollama",
                },
              ],
            },
            vi.fn(),
          ] as const;
        } else {
          // Return mock session
          return [
            {
              messages: [
                {
                  role: "user",
                  content:
                    "User **question**\n\n- first\n\n<script>alert(1)</script>",
                },
                {
                  role: "assistant",
                  content: "Generated *answer*",
                },
              ],
              isLoading: false,
            },
            vi.fn(),
          ] as const;
        }
      },
    );

    (globalThis.chrome.tabs.onZoomChange.addListener as any).mockImplementation(
      (listener: any) => {
        zoomListener = listener;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders LLM Companion header", () => {
    render(<App />);
    expect(screen.getByText(/LLM Companion/i)).toBeDefined();
  });

  it("zooms only prompt and generated text", async () => {
    const { container } = render(<App />);

    expect(document.documentElement.style.fontSize).toBe("");

    const headerText = container.querySelector(
      "header .font-bold",
    ) as HTMLElement;
    expect(headerText.style.fontSize).toBe("");

    const messageBubble = container.querySelector(".markdown-content")
      ?.parentElement as HTMLElement;
    expect(messageBubble.style.fontSize).toBe("1.21875rem");

    const promptSelect = container.querySelectorAll(
      "select",
    )[1] as HTMLSelectElement;
    fireEvent.change(promptSelect, {
      target: { value: "default-grammar-check" },
    });

    const promptTextArea = screen.getByPlaceholderText(
      "Enter your text here...",
    ) as HTMLTextAreaElement;
    expect(promptTextArea.style.fontSize).toBe("1.125rem");
    expect(promptTextArea.style.lineHeight).toBe("1.5rem");

    zoomListener?.({ tabId: 1, newZoomFactor: 1.2 });

    await waitFor(() => {
      expect(messageBubble.style.fontSize).toBe("0.975rem");
      expect(promptTextArea.style.fontSize).toBe("0.9rem");
      expect(promptTextArea.style.lineHeight).toBe("1.2rem");
    });
  });

  it("renders user and assistant messages as safe markdown", () => {
    const { container } = render(<App />);
    const markdownBlocks = container.querySelectorAll(".markdown-content");

    expect(markdownBlocks[0].querySelector("strong")?.textContent).toBe(
      "question",
    );
    expect(markdownBlocks[0].querySelector("li")?.textContent).toBe("first");
    expect(markdownBlocks[1].querySelector("em")?.textContent).toBe("answer");
    expect(container.querySelector("script")).toBeNull();
    expect(markdownBlocks[0].innerHTML).toContain("&lt;script&gt;alert(1)");
  });
});
