import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  watchSettings: vi.fn(),
  handleExecutePrompt: vi.fn(),
}));

vi.mock("../src/lib/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/store")>()),
  settingsStorage: {
    getValue: mocks.getSettings,
    watch: mocks.watchSettings,
  },
}));

vi.mock("../src/lib/utils/discovery", () => ({
  refreshDiscoveredModels: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/entrypoints/background/chat-handler", () => ({
  handleExecutePrompt: mocks.handleExecutePrompt,
}));

import background from "../src/entrypoints/background/index";

describe("Background", () => {
  let commandListener: (command: string, tab: chrome.tabs.Tab) => Promise<void>;
  let openSidePanel: ReturnType<typeof vi.fn>;
  let setSidePanelOptions: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mocks.getSettings.mockResolvedValue({ prompts: [], providers: {} });
    mocks.handleExecutePrompt.mockReset();
    mocks.handleExecutePrompt.mockResolvedValue(undefined);
    openSidePanel = vi.fn().mockResolvedValue(undefined);
    setSidePanelOptions = vi.fn().mockResolvedValue(undefined);

    globalThis.chrome = {
      action: { openPopup: vi.fn() },
      commands: {
        onCommand: {
          addListener: vi.fn((listener) => {
            commandListener = listener;
          }),
        },
      },
      contextMenus: {
        create: vi.fn((_properties, callback) => callback?.()),
        removeAll: vi.fn((callback) => callback?.()),
        onClicked: { addListener: vi.fn() },
      },
      runtime: {
        lastError: undefined,
        onMessage: { addListener: vi.fn() },
      },
      sidePanel: { open: openSidePanel, setOptions: setSidePanelOptions },
      tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
      },
    } as unknown as typeof chrome;

    background.main();
  });

  it("disables the default sidepanel", () => {
    expect(setSidePanelOptions).toHaveBeenCalledWith({ enabled: false });
  });

  it("enables and opens the sidepanel for the command tab", async () => {
    await commandListener("open-sidepanel", { id: 42 } as chrome.tabs.Tab);

    expect(setSidePanelOptions).toHaveBeenCalledWith({
      tabId: 42,
      path: "sidepanel.html",
      enabled: true,
    });
    expect(openSidePanel).toHaveBeenCalledWith({ tabId: 42 });
  });

  it("opens the sidepanel before executing its configured prompt", async () => {
    const tab = { id: 42 } as chrome.tabs.Tab;
    const settings = {
      selectedModelId: "ollama:model",
      prompts: [{ id: "summarize", name: "Summarize", text: "Summarize" }],
      providers: {},
    };
    mocks.getSettings.mockResolvedValue(settings);
    const tabs = chrome.tabs as unknown as {
      query: ReturnType<typeof vi.fn>;
      sendMessage: ReturnType<typeof vi.fn>;
    };
    tabs.query.mockResolvedValue([tab]);
    tabs.sendMessage.mockResolvedValue({ success: true });

    await commandListener("execute-prompt-sidepanel", tab);

    expect(setSidePanelOptions).toHaveBeenCalledWith({
      tabId: 42,
      path: "sidepanel.html",
      enabled: true,
    });
    expect(openSidePanel).toHaveBeenCalledWith({ tabId: 42 });
    expect(mocks.handleExecutePrompt).toHaveBeenCalledWith(
      42,
      expect.any(String),
      "",
    );
    expect(openSidePanel.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.handleExecutePrompt.mock.invocationCallOrder[0],
    );
  });
});
