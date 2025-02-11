import {OpenaiProvider} from "@/components/providers/openai";
import {GeminiProvider} from "@/components/providers/gemini";
import {OllamaProvider} from "@/components/providers/ollama";
import {BaseProvider} from "@/components/providers/base";
import {ProviderType} from "@/components/providers/types";

// Using Factory functions to store anon funcs that returns obj constructor
export const providerClassMap: Record<ProviderType, new() => BaseProvider> = {
    [ProviderType.Openai]: OpenaiProvider,
    [ProviderType.Gemini]: GeminiProvider,
    [ProviderType.Ollama]: OllamaProvider
};