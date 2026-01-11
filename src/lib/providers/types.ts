export interface Model {
    id: string;
    name: string;
    contextLength?: number; // Context window size in tokens
}

export interface ProviderConfig {
    url?: string;
    apiKey?: string;
    enabled: boolean;
    defaultModel?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface GenerationOptions {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

export type StreamHandler = (chunk: string) => void;

export type ProviderType = 'ollama' | 'gemini';
