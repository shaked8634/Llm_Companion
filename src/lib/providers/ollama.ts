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

            const models: Model[] = [];

            // Fetch detailed info for each model to get context length
            for (const m of (data.models || [])) {
                try {
                    const showResponse = await fetch(`${url}/api/show`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: m.name })
                    });

                    if (showResponse.ok) {
                        const modelInfo = await showResponse.json();
                        const contextLength =
                            modelInfo.model_info?.['num_ctx'] ||
                            modelInfo.model_info?.['context_length'] ||
                            modelInfo.details?.['num_ctx'] ||
                            modelInfo.details?.parameter_size?.context ||
                            undefined;
                        models.push({
                            id: m.name,
                            name: m.name,
                            contextLength
                        });
                    } else {
                        // Fallback if show API fails
                        models.push({
                            id: m.name,
                            name: m.name
                        });
                    }
                } catch (showError) {
                    console.warn(`[Ollama] Could not fetch details for ${m.name}:`, showError);
                    // Fallback without context length
                    models.push({
                        id: m.name,
                        name: m.name
                    });
                }
            }

            console.log(`[Ollama] Fetched ${models.length} models`);
            return models;
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

        // Log message details for debugging
        messages.forEach((msg, idx) => {
            console.debug(`[Ollama] Message ${idx} - Role: ${msg.role}, Length: ${msg.content.length} chars`);
            if (msg.content.length > 1000) {
                console.debug(`[Ollama] Message ${idx} preview:`, msg.content.substring(0, 200) + '...');
            }
        });

        const requestBody = {
            model,
            messages,
            stream: true,
            options: {
                temperature: options?.temperature,
                num_predict: options?.maxTokens,
            }
        };

        console.debug('[Ollama] Request body size:', JSON.stringify(requestBody).length, 'bytes');

        const response = await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            let errorDetails = response.statusText;
            try {
                const errorText = await response.text();
                console.error('[Ollama] Request failed:', response.status, response.statusText);
                console.error('[Ollama] Error details:', errorText);

                // Try to parse JSON error for better message
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error) {
                        errorDetails = errorJson.error;
                    }
                } catch {
                    // ignore JSON parse errors
                }
            } catch {
                // ignore error reading response
            }

            throw new Error(`Ollama ${response.status}: ${errorDetails}`);
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
                    } catch {
                        console.warn('[Ollama] Failed to parse chunk:', line);
                    }
                }
            }
        } finally {
            try {
                reader.releaseLock();
                console.log('[Ollama] Reader released');
            } catch {
                console.warn('[Ollama] Error releasing reader');
            }
        }
    }
}
