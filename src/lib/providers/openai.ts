import {BaseProvider} from './base';
import {ChatMessage, GenerationOptions, Model} from './types';

export class OpenAIProvider extends BaseProvider {
    readonly id = 'openai';
    readonly name = 'OpenAI';
    static readonly defaultUrl = 'https://api.openai.com/v1';

    async isConnected(): Promise<boolean> {
        return !!this.config.apiKey;
    }

    async getModels(): Promise<Model[]> {
        if (!this.config.apiKey) return [];
        try {
            const response = await fetch(`${OpenAIProvider.defaultUrl}/models`, {
                headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
            });
            if (!response.ok) throw new Error('Failed to fetch OpenAI models');
            const data = await response.json();
            console.log(`[OpenAI] Fetched ${data.data.length} models`);
            return data.data
                .filter((m: any) => m.id.startsWith('gpt-'))
                .map((m: any) => ({
                    id: m.id,
                    name: m.id
                }));
        } catch (e) {
            console.error('OpenAI getModels error:', e);
            throw e;
        }
    }

    async* stream(
        model: string,
        messages: ChatMessage[],
        options?: GenerationOptions
    ): AsyncGenerator<string, void, unknown> {
        if (!this.config.apiKey) throw new Error('OpenAI API Key is missing');
        const url = `${OpenAIProvider.defaultUrl}/chat/completions`;
        const requestBody = {
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: true,
            temperature: options?.temperature,
            max_tokens: options?.maxTokens,
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`OpenAI error: ${error.error?.message || response.statusText}`);
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
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        if (jsonStr === '[DONE]') return;
                        try {
                            const json = JSON.parse(jsonStr);
                            const text = json.choices?.[0]?.delta?.content;
                            if (text) yield text;
                        } catch (e) {
                            console.warn('[OpenAI] Failed to parse SSE data:', e);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
