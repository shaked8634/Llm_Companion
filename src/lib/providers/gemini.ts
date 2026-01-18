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
            console.log(`[Gemini] Fetched ${data.models.length} models`);
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
        if (!this.config.apiKey) throw new Error('Gemini API Key is missing');

        const contents = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // Use ?alt=sse to get Server-Sent Events format
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`,
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

                // SSE format: each event is "data: {json}\n\n"
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6); // Remove "data: " prefix

                        try {
                            const json = JSON.parse(jsonStr);
                            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) yield text;
                        } catch (e) {
                            console.warn('[Gemini] Failed to parse SSE data:', e);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
