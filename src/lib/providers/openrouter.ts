import { BaseProvider } from "./base";
import { ChatMessage, GenerationOptions, Model } from "./types";

export class OpenRouterProvider extends BaseProvider {
  readonly id = "openrouter";
  readonly name = "OpenRouter";
  static readonly defaultUrl = "https://openrouter.ai/api/v1";

  async isConnected(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  async getModels(): Promise<Model[]> {
    if (!this.config.apiKey) return [];
    try {
      const response = await fetch(`${OpenRouterProvider.defaultUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch OpenRouter models");
      const data = await response.json();
      console.log(`[OpenRouter] Fetched ${data.data?.length || 0} models`);
      return (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: m.context_length,
      }));
    } catch (e) {
      console.error("OpenRouter getModels error:", e);
      throw e;
    }
  }

  async *stream(
    model: string,
    messages: ChatMessage[],
    options?: GenerationOptions,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.config.apiKey) throw new Error("OpenRouter API Key is missing");
    const url = `${OpenRouterProvider.defaultUrl}/chat/completions`;
    const requestBody = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        "HTTP-Referer": "https://github.com/ozzt/Llm_companion",
        "X-Title": "LLM Companion",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter error: ${error.error?.message || response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith("data: ")) {
            const jsonStr = trimmedLine.substring(6).trim();
            if (jsonStr === "[DONE]") return;
            try {
              const json = JSON.parse(jsonStr);
              const text = json.choices?.[0]?.delta?.content;
              if (text) yield text;
            } catch (e) {
              console.warn("[OpenRouter] Failed to parse SSE data:", e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
