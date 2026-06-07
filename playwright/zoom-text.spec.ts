import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { test, expect, type Page } from "@playwright/test";

const settings = {
  activeProvider: "ollama",
  providers: {
    ollama: { enabled: true, url: "http://localhost:11434" },
    gemini: { enabled: false, apiKey: "" },
    openai: { enabled: false, apiKey: "" },
    openrouter: { enabled: false, apiKey: "" },
    custom: { enabled: false, url: "", apiKey: "" },
  },
  activeModel: {},
  selectedModelId: "ollama:test-model",
  discoveredModels: [
    {
      id: "test-model",
      name: "Test Model",
      providerId: "ollama",
      providerName: "Ollama",
    },
  ],
  systemPrompt: "You are a helpful browsing assistant.",
  prompts: [],
  lastSelectedPromptId: undefined,
};

const session = {
  messages: [
    {
      role: "assistant",
      content: "Generated answer",
    },
  ],
  isLoading: false,
};

async function findFile(
  rootDir: string,
  targetName: string,
): Promise<string | null> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isFile() && entry.name === targetName) {
      return fullPath;
    }

    if (entry.isDirectory()) {
      const nested = await findFile(fullPath, targetName);
      if (nested) return nested;
    }
  }

  return null;
}

async function resolveBuildRoot(): Promise<{
  rootDir: string;
  popupHtml: string;
}> {
  const candidates = ["dist", ".output", "build"];

  for (const candidate of candidates) {
    const rootDir = path.resolve(process.cwd(), candidate);
    try {
      await fs.access(rootDir);
    } catch {
      continue;
    }

    const popupHtml = await findFile(rootDir, "popup.html");
    if (popupHtml) {
      return { rootDir, popupHtml };
    }
  }

  throw new Error("Could not find built popup.html");
}

function mimeType(filePath: string): string {
  switch (path.extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function startStaticServer(rootDir: string): Promise<{
  server: ReturnType<typeof createServer>;
  baseUrl: string;
}> {
  const server = createServer(async (req, res) => {
    const requestPath = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    const safePath = requestPath.replace(/^\/+/, "");
    const filePath = path.resolve(rootDir, safePath || "popup.html");

    if (!filePath.startsWith(rootDir)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    try {
      const stat = await fs.stat(filePath);
      const finalPath = stat.isDirectory()
        ? path.join(filePath, "index.html")
        : filePath;
      const body = await fs.readFile(finalPath);

      res.statusCode = 200;
      res.setHeader("Content-Type", mimeType(finalPath));
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start static server");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function mockChrome(page: Page): Promise<void> {
  await page.addInitScript(
    ({ initialSettings, initialSession }) => {
      const store: Record<string, unknown> = {
        "local:settings": initialSettings,
        "local:session:1": initialSession,
      };

      const storageListeners = new Set<
        (changes: Record<string, unknown>, areaName: string) => void
      >();

      const resolveKeys = (keys: unknown) => {
        if (typeof keys === "string") return [keys];
        if (Array.isArray(keys)) return keys;
        if (keys && typeof keys === "object")
          return Object.keys(keys as object);
        return Object.keys(store);
      };

      const resolveGetResult = (keys: unknown) => {
        if (keys && typeof keys === "object" && !Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          for (const [key, defaultValue] of Object.entries(
            keys as Record<string, unknown>,
          )) {
            result[key] = key in store ? store[key] : defaultValue;
          }
          return result;
        }

        return resolveKeys(keys).reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = store[key];
          return acc;
        }, {});
      };

      const notifyStorageChange = (keys: string[]) => {
        const changes = keys.reduce<Record<string, { newValue: unknown }>>(
          (acc, key) => {
            acc[key] = { newValue: store[key] };
            return acc;
          },
          {},
        );

        for (const listener of storageListeners) {
          listener(changes, "local");
        }
      };

      const storageArea = {
        get(
          keys: unknown,
          callback?: (items: Record<string, unknown>) => void,
        ) {
          const result = resolveGetResult(keys);
          callback?.(result);
          return Promise.resolve(result);
        },
        set(items: Record<string, unknown>, callback?: () => void) {
          Object.assign(store, items);
          notifyStorageChange(Object.keys(items));
          callback?.();
          return Promise.resolve();
        },
        remove(keys: unknown, callback?: () => void) {
          for (const key of resolveKeys(keys)) {
            delete store[key];
          }
          callback?.();
          return Promise.resolve();
        },
        clear(callback?: () => void) {
          for (const key of Object.keys(store)) {
            delete store[key];
          }
          callback?.();
          return Promise.resolve();
        },
      };

      const chromeMock = {
        tabs: {
          query: (
            _query: unknown,
            callback: (tabs: Array<{ id: number }>) => void,
          ) => {
            const result = [{ id: 1 }];
            callback(result);
            return Promise.resolve(result);
          },
          getZoom: (_tabId: number, callback: (zoom: number) => void) => {
            callback(1.5);
            return Promise.resolve(1.5);
          },
          onActivated: {
            addListener: () => undefined,
            removeListener: () => undefined,
          },
          onUpdated: {
            addListener: () => undefined,
            removeListener: () => undefined,
          },
          onZoomChange: {
            addListener: (
              listener: (info: {
                tabId: number;
                newZoomFactor: number;
              }) => void,
            ) => {
              (window as any).__zoomListener = listener;
            },
            removeListener: () => undefined,
          },
          sendMessage: async () => ({ success: true }),
        },
        runtime: {
          id: "test-extension",
          lastError: undefined,
          sendMessage: async () => ({}),
          openOptionsPage: async () => undefined,
          onMessage: {
            addListener: () => undefined,
            removeListener: () => undefined,
          },
          getURL: (resourcePath: string) => resourcePath,
        },
        sidePanel: {
          open: async () => undefined,
        },
        storage: {
          local: storageArea,
          onChanged: {
            addListener: (
              listener: (
                changes: Record<string, unknown>,
                areaName: string,
              ) => void,
            ) => {
              storageListeners.add(listener);
            },
            removeListener: (
              listener: (
                changes: Record<string, unknown>,
                areaName: string,
              ) => void,
            ) => {
              storageListeners.delete(listener);
            },
          },
        },
      };

      Object.defineProperty(window, "chrome", {
        value: chromeMock,
        configurable: true,
      });

      Object.defineProperty(window, "browser", {
        value: chromeMock,
        configurable: true,
      });
    },
    {
      initialSettings: settings,
      initialSession: session,
    },
  );
}

test.describe("popup zoom-aware text", () => {
  test("keeps extension chrome fixed and zooms prompt/transcript text", async ({
    page,
  }) => {
    execFileSync("pnpm", ["build"], { stdio: "inherit" });

    const { rootDir, popupHtml } = await resolveBuildRoot();
    const { server, baseUrl } = await startStaticServer(rootDir);
    const relativePopupPath = path
      .relative(rootDir, popupHtml)
      .split(path.sep)
      .join("/");

    try {
      await mockChrome(page);
      await page.goto(`${baseUrl}/${relativePopupPath}`);

      await expect(page.getByText("LLM Companion")).toBeVisible();

      const headerText = page.locator("header .font-bold");
      await expect(headerText).toBeVisible();
      expect(
        await headerText.evaluate((el) => (el as HTMLElement).style.fontSize),
      ).toBe("");

      const messageBubble = page
        .locator(".whitespace-pre-wrap")
        .locator("xpath=..");
      expect(
        await messageBubble.evaluate(
          (el) => (el as HTMLElement).style.fontSize,
        ),
      ).toBe("1.21875rem");

      const promptSelect = page.locator("select").nth(1);
      await promptSelect.selectOption("default-grammar-check");

      const promptTextArea = page.getByPlaceholder("Enter your text here...");
      expect(
        await promptTextArea.evaluate(
          (el) => (el as HTMLTextAreaElement).style.fontSize,
        ),
      ).toBe("1.125rem");
      expect(
        await promptTextArea.evaluate(
          (el) => (el as HTMLTextAreaElement).style.lineHeight,
        ),
      ).toBe("1.5rem");

      await page.evaluate(() => {
        (window as any).__zoomListener?.({ tabId: 1, newZoomFactor: 1.2 });
      });

      expect(
        await messageBubble.evaluate(
          (el) => (el as HTMLElement).style.fontSize,
        ),
      ).toBe("0.975rem");
      expect(
        await promptTextArea.evaluate(
          (el) => (el as HTMLTextAreaElement).style.fontSize,
        ),
      ).toBe("0.9rem");
      expect(
        await promptTextArea.evaluate(
          (el) => (el as HTMLTextAreaElement).style.lineHeight,
        ),
      ).toBe("1.2rem");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
