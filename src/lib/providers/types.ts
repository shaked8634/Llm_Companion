export interface Model {
    id: string;
    name: string;
}

export interface ProviderConfig {
    url?: string;
    apiKey?: string;
    enabled: boolean;
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
