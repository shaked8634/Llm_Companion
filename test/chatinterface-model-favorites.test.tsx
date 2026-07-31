import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/preact";
import ChatInterface from "@/components/ChatInterface";
import * as useStorageModule from "@/hooks/useStorage";
import { defaultSettings } from "@/lib/store";

describe("ChatInterface model favorites", () => {
  const setSettings = vi.fn();

  beforeEach(() => {
    globalThis.chrome = {
      tabs: {
        query: vi.fn((_query, callback) => callback([{ id: 123 }])),
        onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
        onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
        getZoom: vi.fn((_id, callback) => callback(1)),
        onZoomChange: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      runtime: {
        sendMessage: vi.fn(),
        openOptionsPage: vi.fn(),
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      sidePanel: { open: vi.fn() },
    } as any;

    setSettings.mockReset();
    vi.spyOn(useStorageModule, "useStorage").mockImplementation(
      (storageItem: any) => {
        const key = storageItem?.key ?? "";
        if (key.includes("settings")) {
          return [
            {
              ...defaultSettings,
              providers: {
                ...defaultSettings.providers,
                ollama: { enabled: true, url: "http://localhost:11434" },
                openai: { enabled: true, apiKey: "test" },
              },
              selectedModelId: "ollama:z-model",
              favoriteModelIds: ["openai:a-model"],
              discoveredModels: [
                {
                  id: "z-model",
                  name: "Zulu Model",
                  providerId: "ollama",
                  providerName: "Ollama",
                },
                {
                  id: "a-model",
                  name: "Alpha Model",
                  providerId: "openai",
                  providerName: "OpenAI",
                },
              ],
            },
            setSettings,
          ] as const;
        }
        if (key.includes("session")) {
          return [{ messages: [], isLoading: false }, vi.fn()] as const;
        }
        return [null, vi.fn()] as const;
      },
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it("orders favorites first, filters models, and serializes picker changes", async () => {
    render(<ChatInterface mode="popup" />);
    fireEvent.click(screen.getByRole("button", { name: "Choose model" }));

    const modelList = within(screen.getByRole("group", { name: "Models" }));
    const options = modelList.getAllByRole("button", { name: /^Select / });
    expect(options[0].textContent).toContain("Alpha Model");
    expect(options[0].textContent).toContain("OpenAI");
    expect(options[1].textContent).toContain("Zulu Model");

    fireEvent.input(screen.getByRole("searchbox", { name: "Search models" }), {
      target: { value: "ollama" },
    });
    expect(screen.queryByText("Alpha Model")).toBeNull();
    expect(
      modelList.getByRole("button", {
        name: "Select Zulu Model (Ollama)",
      }).textContent,
    ).toContain("Zulu Model");

    fireEvent.click(screen.getByRole("button", { name: "Choose model" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose model" }));
    expect(
      (
        screen.getByRole("searchbox", {
          name: "Search models",
        }) as HTMLInputElement
      ).value,
    ).toBe("");

    fireEvent.click(
      screen.getByRole("button", { name: "Add Zulu Model to favorites" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Select Zulu Model (Ollama)" }),
    );

    await waitFor(() =>
      expect(setSettings).toHaveBeenLastCalledWith(
        expect.objectContaining({
          selectedModelId: "ollama:z-model",
          favoriteModelIds: ["openai:a-model", "ollama:z-model"],
        }),
      ),
    );
  });

  it("repairs a stale selection when models change without changing count", () => {
    const settings = {
      ...defaultSettings,
      providers: {
        ...defaultSettings.providers,
        ollama: { enabled: true, url: "http://localhost:11434" },
      },
      selectedModelId: "ollama:old-model",
      discoveredModels: [
        {
          id: "old-model",
          name: "Old Model",
          providerId: "ollama",
          providerName: "Ollama",
        },
      ],
    };
    vi.mocked(useStorageModule.useStorage).mockImplementation(
      (storageItem: any) =>
        (storageItem?.key ?? "").includes("settings")
          ? ([settings, setSettings] as const)
          : ([{ messages: [], isLoading: false }, vi.fn()] as const),
    );

    const view = render(<ChatInterface mode="popup" />);
    settings.discoveredModels = [
      {
        id: "new-model",
        name: "New Model",
        providerId: "ollama",
        providerName: "Ollama",
      },
    ];
    view.rerender(<ChatInterface mode="popup" />);

    expect(setSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedModelId: "ollama:new-model" }),
    );
  });
});
