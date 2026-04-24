import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/preact";
import Options from "../src/entrypoints/options/Options";
import * as useStorageModule from "../src/hooks/useStorage";
import { defaultSettings } from "@/lib/store";

describe("Options UI", () => {
  beforeEach(() => {
    // Mock useStorage hook to return mock settings
    vi.spyOn(useStorageModule, "useStorage").mockImplementation(() => {
      return [defaultSettings, vi.fn()] as const;
    });
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
});
