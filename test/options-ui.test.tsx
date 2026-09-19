import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import Options from "../src/entrypoints/options/Options";
import * as useStorageModule from "../src/hooks/useStorage";
import { defaultSettings } from "@/lib/store";

describe("Options UI", () => {
  let setSettings: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    globalThis.chrome = {
      runtime: {
        getManifest: vi.fn(() => ({ version: "0.0.9" })),
      },
    } as never;

    setSettings = vi.fn(async () => undefined);
    vi.spyOn(useStorageModule, "useStorage").mockImplementation(() => {
      return [
        defaultSettings,
        setSettings as (newValue: unknown) => Promise<void>,
      ] as const;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders fixed providers without Ollama or Custom rows", () => {
    render(<Options />);
    expect(screen.getAllByText(/Gemini/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OpenAI/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OpenRouter/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Ollama/i)).toBeNull();
    expect(screen.queryByText(/^Custom$/i)).toBeNull();
    expect(
      screen.getByRole("button", {
        name: /add custom provider endpoint/i,
      }),
    ).toBeDefined();
  });

  it("adds an editable OpenAI-compatible provider row", () => {
    render(<Options />);
    fireEvent.click(
      screen.getByRole("button", {
        name: /add custom provider endpoint/i,
      }),
    );

    expect(screen.getByDisplayValue("New Provider")).toBeDefined();
    const savedSettings = setSettings.mock.lastCall?.[0];
    expect(Object.values(savedSettings.customProviders)).toEqual([
      expect.objectContaining({ name: "New Provider", enabled: true }),
    ]);
  });

  it("validates provider names and deletes provider data", () => {
    render(<Options />);
    fireEvent.click(
      screen.getByRole("button", {
        name: /add custom provider endpoint/i,
      }),
    );

    const providerName = screen.getByDisplayValue("New Provider");
    fireEvent.input(providerName, { target: { value: "" } });
    expect(screen.getByText("Provider name is required.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /delete provider/i }));
    const savedSettings = setSettings.mock.lastCall?.[0];
    expect(savedSettings.customProviders).toEqual({});
  });

  it("renders the extension version and repository links in the About tab", () => {
    render(<Options />);

    fireEvent.click(screen.getByRole("button", { name: /about/i }));

    const forgejoLink = screen.getByRole("link", {
      name: /forgejo/i,
    });
    const githubMirrorLink = screen.getByRole("link", {
      name: /github mirror/i,
    });

    expect(screen.getByText("v0.0.0")).toBeDefined();
    expect(forgejoLink).toBeDefined();
    expect(forgejoLink.getAttribute("href")).toBe(
      "https://forgejo.o-st.dev/ST_Consultancy/Llm_companion",
    );
    expect(githubMirrorLink).toBeDefined();
    expect(githubMirrorLink.getAttribute("href")).toBe(
      "https://github.com/shaked8634/Llm_Companion",
    );
    expect(forgejoLink.parentElement?.className).toContain("flex");
  });

  it("renders support development addresses inside one shared container", () => {
    render(<Options />);

    fireEvent.click(screen.getByRole("button", { name: /about/i }));

    const supportContainer = screen.getByLabelText(
      /support development addresses/i,
    );

    expect(supportContainer).toBeDefined();
    expect(supportContainer.querySelectorAll("a").length).toBe(4);
    expect(supportContainer.textContent).toContain("BTC:");
    expect(supportContainer.textContent).toContain("ETH:");
    expect(supportContainer.textContent).toContain("SOL:");
    expect(supportContainer.textContent).toContain("XMR:");
  });

  it("manages search engines in a dedicated tab", () => {
    render(<Options />);

    fireEvent.click(screen.getByRole("button", { name: /search engines/i }));

    expect(screen.getByText("DuckDuckGo")).toBeDefined();
    expect(
      screen.getByDisplayValue("https://html.duckduckgo.com/html/?q=%s"),
    ).toHaveProperty("disabled", true);
    expect(screen.queryByLabelText(/delete duckduckgo/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /add search engine/i }));

    expect(setSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        searchEngines: expect.arrayContaining([
          expect.objectContaining({
            name: "New Search Engine",
            queryUrl: "https://example.com/search?q=%s",
          }),
        ]),
      }),
    );
  });

  it("saves the response timeout from the Advanced tab", () => {
    render(<Options />);

    fireEvent.click(screen.getByRole("button", { name: /advanced/i }));
    const input = screen.getByLabelText(/response timeout/i);
    expect(input).toHaveProperty("value", "120");

    fireEvent.input(input, { target: { value: "90" } });
    expect(setSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ responseTimeoutSeconds: 90 }),
    );
  });

  it("saves popup dimensions from the Advanced tab", () => {
    render(<Options />);

    fireEvent.click(screen.getByRole("button", { name: /advanced/i }));
    const width = screen.getByLabelText(/popup width/i);
    const height = screen.getByLabelText(/popup height/i);

    expect(width).toHaveProperty("value", "640");
    expect(height).toHaveProperty("value", "");

    fireEvent.input(width, { target: { value: "700" } });
    expect(setSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ popupWidth: 700 }),
    );

    fireEvent.input(height, { target: { value: "500" } });
    expect(setSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ popupHeight: 500 }),
    );

    fireEvent.input(height, { target: { value: "" } });
    expect(setSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ popupHeight: undefined }),
    );
  });
});
