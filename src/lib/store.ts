import { storage } from "#imports";
import type { WxtStorageItem } from "wxt/utils/storage";
import {
  ChatMessage,
  Model,
  ProviderConfig,
  ProviderType,
} from "./providers/types";

export enum PromptType {
  WITH_WEBPAGE = "with-webpage",
  FREE_TEXT = "free-text",
  SELECTED_TEXT = "selected-text",
}

export interface Prompt {
  id: string;
  name: string;
  text: string;
  type: PromptType;
  isDefault?: boolean;
  allowInput?: boolean;
  inputPlaceholder?: string;
}

export interface DiscoveredModel extends Model {
  providerId: string;
  providerName: string;
}

export type ProviderSettings = Record<ProviderType, ProviderConfig>;

export interface AppSettings {
  activeProvider: "ollama" | "gemini" | "openai" | "openrouter" | "custom";
  providers: ProviderSettings;
  activeModel: {
    ollama?: string;
    gemini?: string;
    openai?: string;
    openrouter?: string;
    custom?: string;
  };
  selectedModelId?: string; // Format: "providerId:modelId"
  discoveredModels: DiscoveredModel[];
  systemPrompt: string;
  prompts: Prompt[];
  lastSelectedPromptId?: string; // Last selected prompt ID for persistence
}

export interface TabSession {
  messages: ChatMessage[];
  isLoading: boolean;
  lastError?: string;
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  ollama: { enabled: false, url: "http://localhost:11434" },
  gemini: { enabled: false, apiKey: "" },
  openai: { enabled: false, apiKey: "" },
  openrouter: { enabled: false, apiKey: "" },
  custom: { enabled: false, url: "", apiKey: "" },
};

export const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: "default-summarize",
    name: "Summarize this page",
    text: "Summarize this page with less than 500 words",
    type: PromptType.WITH_WEBPAGE,
    isDefault: true,
  },
  {
    id: "default-converse-with-page",
    name: "Converse with the page",
    text: "Answer the user's request using the current page content. If the page does not contain the answer, say so clearly.",
    type: PromptType.WITH_WEBPAGE,
    isDefault: true,
    allowInput: true,
    inputPlaceholder: "Ask something about this page...",
  },
  {
    id: "default-grammar-check",
    name: "Check Grammar",
    text: "Fix any grammar mistakes, spelling errors, and abbreviations in the following text. Respond ONLY with the corrected text, without any explanations or comments.",
    type: PromptType.FREE_TEXT,
    isDefault: true,
  },
  {
    id: "default-selected-explain",
    name: "Explain selected paragraph",
    text: "Explain the following paragraph in simple, clear terms:",
    type: PromptType.SELECTED_TEXT,
    isDefault: true,
  },
  {
    id: "default-selected-translate",
    name: "Translate Selected text",
    text: "Translate the following text to English. Respond ONLY with the translation.",
    type: PromptType.SELECTED_TEXT,
    isDefault: true,
  },
];

export function getProviderSettingsWithDefaults(
  providers?: Partial<ProviderSettings>,
): ProviderSettings {
  return {
    ollama: {
      ...DEFAULT_PROVIDER_SETTINGS.ollama,
      ...(providers?.ollama ?? {}),
    },
    gemini: {
      ...DEFAULT_PROVIDER_SETTINGS.gemini,
      ...(providers?.gemini ?? {}),
    },
    openai: {
      ...DEFAULT_PROVIDER_SETTINGS.openai,
      ...(providers?.openai ?? {}),
    },
    openrouter: {
      ...DEFAULT_PROVIDER_SETTINGS.openrouter,
      ...(providers?.openrouter ?? {}),
    },
    custom: {
      ...DEFAULT_PROVIDER_SETTINGS.custom,
      ...(providers?.custom ?? {}),
    },
  };
}

export function getPromptsWithDefaults(prompts?: Prompt[]): Prompt[] {
  const existingPrompts = prompts ?? [];
  const promptsById = new Map(
    existingPrompts.map((prompt) => [prompt.id, prompt]),
  );

  const mergedDefaultPrompts = DEFAULT_PROMPTS.map((defaultPrompt) => ({
    ...defaultPrompt,
    ...(promptsById.get(defaultPrompt.id) ?? {}),
  }));

  const customPrompts = existingPrompts.filter(
    (prompt) =>
      !DEFAULT_PROMPTS.some((defaultPrompt) => defaultPrompt.id === prompt.id),
  );

  return [...mergedDefaultPrompts, ...customPrompts];
}

export const defaultSettings: AppSettings = {
  activeProvider: "ollama",
  providers: getProviderSettingsWithDefaults(),
  activeModel: {},
  selectedModelId: undefined,
  discoveredModels: [],
  systemPrompt:
    "You are a helpful browsing assistant. Summarize or answer questions based on the provided page content.",
  prompts: getPromptsWithDefaults(),
};

export const settingsStorage: WxtStorageItem<
  AppSettings,
  Record<string, never>
> = storage.defineItem("local:settings", {
  defaultValue: defaultSettings,
});

export function getTabSessionKey(tabId: number): `local:session:${number}` {
  return `local:session:${tabId}`;
}

export function getTabSession(
  tabId: number,
): WxtStorageItem<TabSession, Record<string, never>> {
  return storage.defineItem<TabSession>(getTabSessionKey(tabId), {
    defaultValue: { messages: [], isLoading: false },
  });
}
