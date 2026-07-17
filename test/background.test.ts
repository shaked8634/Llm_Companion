import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  watchSettings: vi.fn(),
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
  handleExecutePrompt: vi.fn().mockResolvedValue(undefined),
}));

import background from "../src/entrypoints/background/index";

describe("Background", () => {
  let commandListener: (command: string, tab: chrome.tabs.Tab) => Promise<void>;
  let openSidePanel: ReturnType<typeof vi.fn>;
  let queryTabs: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mocks.getSettings.mockResolvedValue({ prompts: [], providers: {} });
    openSidePanel = vi.fn().mockResolvedValue(undefined);
    queryTabs = vi.fn();

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
      sidePanel: { open: openSidePanel },
      tabs: { query: queryTabs },
    } as unknown as typeof chrome;

    background.main();
  });

  it("opens the sidepanel directly for the command tab", async () => {
    await commandListener("open-sidepanel", { id: 42 } as chrome.tabs.Tab);

    expect(openSidePanel).toHaveBeenCalledWith({ tabId: 42 });
    expect(queryTabs).not.toHaveBeenCalled();
  });
});
