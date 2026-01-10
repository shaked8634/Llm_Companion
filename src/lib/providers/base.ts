import {ChatMessage, GenerationOptions, Model, ProviderConfig} from './types';

export abstract class BaseProvider {
    abstract readonly id: string;
    abstract readonly name: string;
    protected config: ProviderConfig;

    constructor(config: ProviderConfig) {
        this.config = config;
    }

    abstract isConnected(): Promise<boolean>;
    abstract getModels(): Promise<Model[]>;
    
    /**
     * Generates a streaming response.
     * Yields chunks of text as they arrive.
     */
    abstract stream(
        model: string, 
        messages: ChatMessage[], 
        options?: GenerationOptions
    ): AsyncGenerator<string, void, unknown>;

    updateConfig(config: Partial<ProviderConfig>) {
        this.config = { ...this.config, ...config };
    }

    getConfig(): ProviderConfig {
        return { ...this.config };
    }
}
