import {storage} from 'wxt/storage';
import {ChatMessage, Model, ProviderConfig} from './providers/types';

export interface Prompt {
    id: string;
    name: string;
    text: string;
    isDefault?: boolean;
}

export interface DiscoveredModel extends Model {
    providerId: string;
    providerName: string;
}

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
    discoveredModels: DiscoveredModel[];
    systemPrompt: string;
    prompts: Prompt[];
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
    discoveredModels: [],
    systemPrompt: 'You are a helpful browsing assistant. Summarize or answer questions based on the provided page content.',
    prompts: [
        {
            id: 'default-summarize',
            name: 'Summarize this page',
            text: 'Summarize this page with less than 500 words',
            isDefault: true
        }
    ]
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
