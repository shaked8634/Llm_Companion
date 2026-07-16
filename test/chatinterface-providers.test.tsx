import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/preact";
import ChatInterface from "@/components/ChatInterface";
import * as useStorageModule from "@/hooks/useStorage";
import { defaultSettings } from "@/lib/store";

describe("ChatInterface provider enablement", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Minimal chrome mocks
    globalThis.chrome = {
      tabs: {
        query: vi.fn((_q, cb) => cb([{ id: 123 }])),
        onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
        onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
        getZoom: vi.fn((_id, cb) => cb(1)),
        onZoomChange: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      runtime: {
        sendMessage: vi.fn(),
        openOptionsPage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      sidePanel: { open: vi.fn() },
      action: { openPopup: vi.fn() },
    } as any;

    vi.spyOn(useStorageModule, "useStorage").mockImplementation(
      (storageItem: any) => {
        const key = storageItem?.key ?? "";
        const isSettings = typeof key === "string" && key.includes("settings");
        if (isSettings) {
          return [
            {
              ...defaultSettings,
              providers: {
                ...defaultSettings.providers,
                ollama: { enabled: false, url: "" },
                gemini: { enabled: false, apiKey: "" },
                openai: { enabled: false, apiKey: "" },
                openrouter: { enabled: true, apiKey: "or-token" },
                custom: { enabled: false, url: "", apiKey: "" },
              },
              // discoveredModels contains only OpenRouter models
              discoveredModels: [
                {
                  id: "or-1",
                  name: "OpenRouter Model 1",
                  providerId: "openrouter",
                  providerName: "OpenRouter",
                },
              ],
              selectedModelId: undefined,
            },
            vi.fn(),
          ] as const;
        }

        const isSession = typeof key === "string" && key.includes("session");
        if (isSession) {
          return [
            {
              messages: [],
              isLoading: false,
            },
            vi.fn(),
          ] as const;
        }

        return [null, vi.fn()] as const;
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("enables model select when OpenRouter provider is enabled and models discovered", async () => {
    const { container } = render(<ChatInterface mode="popup" />);

    // The first select is the models select
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.disabled).toBe(false);

    // Ensure OpenRouter model option is present
    const option = Array.from(select.options).find(
      (o) => o.value === "openrouter:or-1",
    );
    expect(option).toBeDefined();
    expect(option?.text).toContain("OpenRouter Model 1");
  });
});
