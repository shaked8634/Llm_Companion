import {storage} from 'wxt/storage';
import {ChatMessage, ProviderConfig} from './providers/types';

export interface AppSettings {
    activeProvider: 'ollama' | 'gemini';
    providers: {
        ollama: ProviderConfig;
        gemini: ProviderConfig;
    };
    activeModel: {
        ollama?: string;
        gemini?: string;
    };
    selectedModelId?: string; // Format: "providerId:modelId"
    systemPrompt: string;
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
        gemini: { enabled: false, apiKey: '' }
    },
    activeModel: {},
    selectedModelId: undefined,
    systemPrompt: 'You are a helpful browsing assistant. Summarize or answer questions based on the provided page content.'
};

export const settingsStorage = storage.defineItem<AppSettings>(
    'local:settings',
    { defaultValue: defaultSettings }
);

export function getTabSessionKey(tabId: number) {
    return `local:session:${tabId}` as const as any;
}

export function getTabSession(tabId: number) {
    return storage.defineItem<TabSession>(
        getTabSessionKey(tabId),
        { defaultValue: { messages: [], isLoading: false } }
    );
}
