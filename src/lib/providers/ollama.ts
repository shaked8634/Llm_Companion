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
        console.debug('[Ollama] Starting stream request');
        console.debug('[Ollama] URL:', `${url}/api/chat`);
        console.debug('[Ollama] Model:', model);
        console.debug('[Ollama] Messages count:', messages.length);

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
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('[Ollama] Request failed:', response.status, response.statusText);
            console.error('[Ollama] Error details:', errorText);
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        console.debug('[Ollama] Stream connection established');

        const reader = response.body?.getReader();
        if (!reader) {
            console.error('[Ollama] No reader available from response');
            return;
        }

        const decoder = new TextDecoder();
        let totalChunks = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.debug('[Ollama] Stream ended, total chunks:', totalChunks);
                    break;
                }

                totalChunks++;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            yield json.message.content;
                        }
                        if (json.done) {
                            console.debug('[Ollama] Received done signal');
                            break;
                        }
                    } catch (_e) {
                        console.warn('[Ollama] Failed to parse chunk:', line);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
