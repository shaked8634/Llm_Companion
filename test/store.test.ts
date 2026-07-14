import { describe, expect, it } from "vitest";
import {
  getPromptsWithDefaults,
  defaultSettings,
  getProviderSettingsWithDefaults,
  getTabSessionKey,
  PromptType,
} from "@/lib/store";

describe("Store", () => {
  it("defaultSettings should have required properties", () => {
    expect(defaultSettings).toHaveProperty("providers");
    expect(defaultSettings).toHaveProperty("prompts");
    expect(defaultSettings).toHaveProperty("discoveredModels");
    expect(defaultSettings.providers.ollama.enabled).toBe(false);
  });

  it("getTabSessionKey should return correct key", () => {
    expect(getTabSessionKey(123)).toBe("local:session:123");
  });

  it("getProviderSettingsWithDefaults should fill missing provider entries", () => {
    const providerSettings = getProviderSettingsWithDefaults({
      openrouter: {
        enabled: true,
        apiKey: "or-token",
      },
    });

    expect(providerSettings.openrouter.enabled).toBe(true);
    expect(providerSettings.openrouter.apiKey).toBe("or-token");
    expect(providerSettings.ollama.enabled).toBe(false);
    expect(providerSettings.custom.enabled).toBe(false);
  });

  it("defaultSettings should include built-in translate and converse prompts", () => {
    expect(
      defaultSettings.prompts.find(
        (prompt) => prompt.id === "default-selected-translate",
      ),
    ).toMatchObject({
      name: "Translate Selected text",
    });

    expect(
      defaultSettings.prompts.find(
        (prompt) => prompt.id === "default-converse-with-page",
      ),
    ).toMatchObject({
      name: "Converse with the page",
      allowInput: true,
    });
  });

  it("getPromptsWithDefaults should add missing built-in prompts", () => {
    const prompts = getPromptsWithDefaults([
      {
        id: "custom-prompt",
        name: "Custom Prompt",
        text: "Custom text",
        type: PromptType.FREE_TEXT,
      },
    ]);

    expect(
      prompts.some((prompt) => prompt.id === "default-selected-translate"),
    ).toBe(true);
    expect(
      prompts.some((prompt) => prompt.id === "default-converse-with-page"),
    ).toBe(true);
    expect(prompts.some((prompt) => prompt.id === "custom-prompt")).toBe(true);
  });

  it("getPromptsWithDefaults should remove duplicate prompt ids", () => {
    const prompt = {
      id: "duplicate-prompt",
      name: "Duplicate Prompt",
      text: "Custom text",
      type: PromptType.SELECTED_TEXT,
    };
    const prompts = getPromptsWithDefaults([prompt, prompt]);

    expect(prompts.filter(({ id }) => id === prompt.id)).toHaveLength(1);
  });
});
