import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import Options from "../src/entrypoints/options/Options";
import * as useStorageModule from "../src/hooks/useStorage";
import { defaultSettings } from "@/lib/store";

describe("Options UI", () => {
  beforeEach(() => {
    globalThis.chrome = {
      runtime: {
        getManifest: vi.fn(() => ({ version: "0.0.9" })),
      },
    } as never;

    // Mock useStorage hook to return mock settings
    vi.spyOn(useStorageModule, "useStorage").mockImplementation(() => {
      return [defaultSettings, vi.fn()] as const;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders Providers tab with all supported providers", () => {
    render(<Options />);
    expect(screen.getAllByText(/Ollama/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Gemini/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OpenAI/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OpenRouter/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Custom/i).length).toBeGreaterThan(0);
  });

  it("renders API Key and URL inputs for Custom provider", () => {
    render(<Options />);
    // Use getAllByText and pick one, or use a more specific selector
    const customSpans = screen.getAllByText("Custom");
    const customRow = customSpans[0].closest("tr");
    expect(customRow).toBeDefined();

    // Check for API Key and URL inputs within that row
    const inputs = customRow?.querySelectorAll("input");
    // Checkbox, API Key (password), URL (text)
    expect(inputs?.length).toBe(3);
    expect(inputs?.[1].getAttribute("placeholder")).toBe("API Key");
    expect(inputs?.[1].getAttribute("type")).toBe("password");
    expect(inputs?.[2].getAttribute("type")).toBe("text");
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
});
