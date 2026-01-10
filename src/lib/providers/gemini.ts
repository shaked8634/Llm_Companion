import {BaseProvider} from './base';
import {ChatMessage, GenerationOptions, Model} from './types';

export class GeminiProvider extends BaseProvider {
    readonly id = 'gemini';
    readonly name = 'Gemini';

    async isConnected(): Promise<boolean> {
        return !!this.config.apiKey;
    }

    async getModels(): Promise<Model[]> {
        // Common Gemini models
        return [
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
            { id: 'gemini-pro', name: 'Gemini 1.0 Pro' },
        ];
    }

    async* stream(
        model: string,
        messages: ChatMessage[],
        options?: GenerationOptions
    ): AsyncGenerator<string, void, unknown> {
        if (!this.config.apiKey) throw new Error('Gemini API Key is missing');

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
            throw new Error(`Gemini error: ${error.error?.message || response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

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
                                    console.warn('Failed to parse Gemini chunk:', jsonStr);
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
