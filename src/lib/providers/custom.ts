import { BaseProvider } from "./base";
import { ChatMessage, GenerationOptions, Model } from "./types";

export class CustomProvider extends BaseProvider {
  readonly id = "custom";
  readonly name = "Custom";

  async isConnected(): Promise<boolean> {
    return !!this.config.url;
  }

  private getBaseUrl(): string {
    let url = this.config.url || "";
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }
    return url;
  }

  async getModels(): Promise<Model[]> {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) return [];
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${baseUrl}/models`, {
        headers,
      });
      if (!response.ok)
        throw new Error("Failed to fetch models from custom provider");
      const data = await response.json();

      // Some providers return a simple list, others follow OpenAI format
      const modelsList = Array.isArray(data) ? data : data.data;

      if (!Array.isArray(modelsList)) {
        throw new Error(
          "Invalid response format from custom provider models endpoint",
        );
      }

      return modelsList.map((m: any) => ({
        id: m.id || m,
        name: m.name || m.id || m,
      }));
    } catch (e) {
      console.error("Custom OpenAI getModels error:", e);
      throw e;
    }
  }

  async *stream(
    model: string,
    messages: ChatMessage[],
    options?: GenerationOptions,
  ): AsyncGenerator<string, void, unknown> {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) throw new Error("Custom OpenAI Base URL is missing");

    const url = `${baseUrl}/chat/completions`;
    const requestBody = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Custom OpenAI error: ${error.error?.message || response.statusText}`,
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
            const jsonStr = trimmedLine.substring(6);
            if (jsonStr === "[DONE]") return;
            try {
              const json = JSON.parse(jsonStr);
              const text = json.choices?.[0]?.delta?.content;
              if (text) yield text;
            } catch (e) {
              console.warn("[Custom OpenAI] Failed to parse SSE data:", e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
