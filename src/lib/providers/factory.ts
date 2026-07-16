import { BaseProvider } from "./base";
import { OllamaProvider } from "./ollama";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { OpenRouterProvider } from "./openrouter";
import { CustomProvider } from "./custom";
import { ProviderConfig, ProviderType } from "./types";

export class ProviderFactory {
  static create(type: ProviderType, config: ProviderConfig): BaseProvider {
    switch (type) {
      case "ollama":
        return new OllamaProvider(config);
      case "gemini":
        return new GeminiProvider(config);
      case "openai":
        return new OpenAIProvider(config);
      case "openrouter":
        return new OpenRouterProvider(config);
      case "custom":
        return new CustomProvider(config);
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}
