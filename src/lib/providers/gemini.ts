import {BaseProvider} from './base';
import {ChatMessage, GenerationOptions, Model} from './types';

export class GeminiProvider extends BaseProvider {
    readonly id = 'gemini';
    readonly name = 'Gemini';

    async isConnected(): Promise<boolean> {
        return !!this.config.apiKey;
    }

    async getModels(): Promise<Model[]> {
        if (!this.config.apiKey) return [];
        try {
        const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`
            );
            if (!response.ok) throw new Error('Failed to fetch Gemini models');

            const data = await response.json();
            return data.models
                .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
                .map((m: any) => ({
                    id: m.name.replace('models/', ''),
                    name: m.displayName
                }));
        } catch (e) {
            console.error('Gemini getModels error:', e);
            throw e;
        }
    }

    async* stream(
        model: string,
        messages: ChatMessage[],
        options?: GenerationOptions
    ): AsyncGenerator<string, void, unknown> {
        if (!this.config.apiKey) {
            console.error('[Gemini] API Key is missing');
            throw new Error('Gemini API Key is missing');
        }

        console.debug('[Gemini] Starting stream request');
        console.debug('[Gemini] Model:', model);
        console.debug('[Gemini] Messages count:', messages.length);

        const contents = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${this.config.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: options?.temperature,
                        maxOutputTokens: options?.maxTokens,
                    }
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('[Gemini] Request failed:', response.status, response.statusText);
            console.error('[Gemini] Error details:', error);
            throw new Error(`Gemini error: ${error.error?.message || response.statusText}`);
        }

        console.debug('[Gemini] Stream connection established');

        const reader = response.body?.getReader();
        if (!reader) {
            console.error('[Gemini] No reader available from response');
            return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let totalChunks = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.debug('[Gemini] Stream ended, total chunks processed:', totalChunks);
                    break;
                }

                totalChunks++;

                buffer += decoder.decode(value, { stream: true });
                
                // Gemini stream is an array of JSON objects: [ {...}, {...}
                // We need to extract the individual objects.

                // Remove the starting '[' or leading ',\n'
                buffer = buffer.replace(/^\[\s*/, '').replace(/^,\s*/, '');

                let braceCount = 0;
                let inString = false;
                let start = 0;

                for (let i = 0; i < buffer.length; i++) {
                    const char = buffer[i];
                    if (char === '"' && buffer[i - 1] !== '\\') inString = !inString;
                    if (!inString) {
                        if (char === '{') braceCount++;
                        if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                const jsonStr = buffer.substring(start, i + 1);
                                try {
                                    const json = JSON.parse(jsonStr);
                                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                                    if (text) yield text;
                                } catch (_e) {
                                    console.warn('[Gemini] Failed to parse chunk:', jsonStr.substring(0, 100));
                                }
                                buffer = buffer.substring(i + 1).replace(/^,\s*/, '');
                                i = -1; // Reset loop for new buffer
                                start = 0;
                            }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
