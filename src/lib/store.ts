import {storage} from '#imports';
import type {WxtStorageItem} from 'wxt/utils/storage';
import {ChatMessage, Model, ProviderConfig} from './providers/types';

export enum PromptType {
    WITH_WEBPAGE = 'with-webpage',
    FREE_TEXT = 'free-text'
}

export interface Prompt {
    id: string;
    name: string;
    text: string;
    type: PromptType;
    isDefault?: boolean;
}

export interface DiscoveredModel extends Model {
    providerId: string;
    providerName: string;
}

export interface AppSettings {
    activeProvider: 'ollama' | 'gemini' | 'openai';
    providers: {
        ollama: ProviderConfig;
        gemini: ProviderConfig;
        openai: ProviderConfig;
    };
    activeModel: {
        ollama?: string;
        gemini?: string;
        openai?: string;
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

export const defaultSettings: AppSettings = {
    activeProvider: 'ollama',
    providers: {
        ollama: { enabled: true, url: 'http://localhost:11434' },
        gemini: { enabled: false, apiKey: '' },
        openai: { enabled: false, apiKey: '' }
    },
    activeModel: {},
    selectedModelId: undefined,
    discoveredModels: [],
    systemPrompt: 'You are a helpful browsing assistant. Summarize or answer questions based on the provided page content.',
    prompts: [
        {
            id: 'default-summarize',
            name: 'Summarize this page',
            text: 'Summarize this page with less than 500 words',
            type: PromptType.WITH_WEBPAGE,
            isDefault: true
        },
        {
            id: 'default-grammar-check',
            name: 'Check Grammar',
            text: 'Fix any grammar mistakes, spelling errors, and abbreviations in the following text. Respond ONLY with the corrected text, without any explanations or comments.',
            type: PromptType.FREE_TEXT,
            isDefault: true
        }
    ]
};

export const settingsStorage: WxtStorageItem<AppSettings, Record<string, never>> = storage.defineItem('local:settings', {
    defaultValue: defaultSettings
});

export function getTabSessionKey(tabId: number): `local:session:${number}` {
    return `local:session:${tabId}`;
}

export function getTabSession(tabId: number): WxtStorageItem<TabSession, Record<string, never>> {
    return storage.defineItem<TabSession>(
        getTabSessionKey(tabId),
        { defaultValue: { messages: [], isLoading: false } }
    );
}
