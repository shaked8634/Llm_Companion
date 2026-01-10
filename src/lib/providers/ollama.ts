import {BaseProvider} from './base';
import {ChatMessage, GenerationOptions, Model} from './types';

export class OllamaProvider extends BaseProvider {
    readonly id = 'ollama';
    readonly name = 'Ollama';
    static readonly defaultUrl = 'http://localhost:11434';

    async isConnected(): Promise<boolean> {
        try {
            const url = this.config.url || OllamaProvider.defaultUrl;
            const response = await fetch(`${url}/api/version`);
            const data = await response.json();
            return !!data.version;
        } catch {
            return false;
        }
    }

    async getModels(): Promise<Model[]> {
        try {
            const url = this.config.url || OllamaProvider.defaultUrl;
            const response = await fetch(`${url}/api/tags`);
            const data = await response.json();
            return (data.models || []).map((m: any) => ({
                id: m.name,
                name: m.name,
            }));
        } catch (error) {
            console.error('Ollama getModels error:', error);
            return [];
        }
    }

    async* stream(
        model: string,
        messages: ChatMessage[],
        options?: GenerationOptions
    ): AsyncGenerator<string, void, unknown> {
        const url = this.config.url || OllamaProvider.defaultUrl;
        
        const response = await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                stream: true,
                options: {
                    temperature: options?.temperature,
                    num_predict: options?.maxTokens,
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            yield json.message.content;
                        }
                        if (json.done) break;
                    } catch (_e) {
                        console.warn('Failed to parse Ollama chunk:', line);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
