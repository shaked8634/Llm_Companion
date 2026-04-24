import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshDiscoveredModels } from "@/lib/utils/discovery";
import { defaultSettings, settingsStorage } from "@/lib/store";
import { ProviderFactory } from "@/lib/providers/factory";

describe("refreshDiscoveredModels", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips Ollama when it is disabled and only fetches enabled OpenRouter models", async () => {
    const settings = {
      ...defaultSettings,
      providers: {
        ...defaultSettings.providers,
        ollama: { enabled: false, url: "http://localhost:11434" },
        openrouter: { enabled: true, apiKey: "or-token" },
      },
      discoveredModels: [],
    };

    const getModels = vi.fn().mockResolvedValue([
      {
        id: "openrouter/model-1",
        name: "OpenRouter Model 1",
      },
      {
        id: "openrouter/model-2",
        name: "OpenRouter Model 2",
      },
    ]);

    const createSpy = vi
      .spyOn(ProviderFactory, "create")
      .mockImplementation((type) => {
        if (type !== "openrouter") {
          throw new Error(`Unexpected provider creation for ${type}`);
        }

        return {
          getModels,
        } as never;
      });

    const getValueSpy = vi
      .spyOn(settingsStorage, "getValue")
      .mockResolvedValue(settings);
    const setValueSpy = vi
      .spyOn(settingsStorage, "setValue")
      .mockResolvedValue(undefined as never);

    await refreshDiscoveredModels();

    expect(getValueSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith("openrouter", {
      enabled: true,
      apiKey: "or-token",
    });
    expect(getModels).toHaveBeenCalledTimes(1);
    expect(setValueSpy).toHaveBeenCalledWith({
      ...settings,
      discoveredModels: [
        {
          id: "openrouter/model-1",
          name: "OpenRouter Model 1",
          providerId: "openrouter",
          providerName: "OpenRouter",
        },
        {
          id: "openrouter/model-2",
          name: "OpenRouter Model 2",
          providerId: "openrouter",
          providerName: "OpenRouter",
        },
      ],
    });
  });
});
