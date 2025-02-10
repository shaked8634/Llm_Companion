import {OpenaiProvider} from "@/components/providers/openai";
import {GeminiProvider} from "@/components/providers/gemini";
import {OllamaProvider} from "@/components/providers/ollama";
import {BaseProvider} from "@/components/providers/base";

export enum ProviderType {
    Openai = 'Openai',
    Gemini = 'Gemini',
    Ollama = 'Ollama'
}

export const providerClassMap: Record<ProviderType, typeof BaseProvider> = {
    [ProviderType.Openai]: OpenaiProvider,
    [ProviderType.Gemini]: GeminiProvider,
    [ProviderType.Ollama]: OllamaProvider
};