import {OpenaiProvider} from "@/components/providers/openai";
// import {GeminiProvider} from "@/components/providers/gemini";
import {OllamaProvider} from "@/components/providers/ollama";
import {BaseProvider} from "@/components/providers/base";
import {ProviderType} from "@/components/providers/types";
import {getItem} from "@/common/storage";

// Using Factory functions to store anon funcs that returns obj constructor
const providerClassMap: Record<ProviderType, new() => BaseProvider> = {
    [ProviderType.Openai]: OpenaiProvider,
    // [ProviderType.Gemini]: GeminiProvider,
    [ProviderType.Ollama]: OllamaProvider
};

// Given provider name return an instance of the provider
export async function loadProvider(providerType: string): Promise<BaseProvider> {
    const ProviderClass = providerClassMap[providerType as keyof typeof providerClassMap];
    const providerInstance = new ProviderClass();
    const providerData = await getItem(providerType);
    if (providerData) {
        providerInstance.populate(JSON.parse(providerData));
    }
    return providerInstance
}

export async function getProviders() {
    const providerMapping: Record<ProviderType, BaseProvider> = {} as Record<ProviderType, BaseProvider>;

    for (const providerType of Object.values(ProviderType)) {
        providerMapping[providerType] = await loadProvider(providerType);
    }
    return providerMapping;
}