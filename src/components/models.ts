import {AiProvider} from "@/components/providers/provider";

export class Model {
    constructor(
        public name: string,
        public provider: string,
        public enabled: boolean = true
    ) {
        this.name = name
        this.provider = provider
        this.enabled = enabled
    }
}

/**
 * Fetches models from all provided AI providers and save them.
 * @param providers Array of AI providers.
 * @returns A flattened array of all models from all providers.
 */
export async function updateModels(providers: AiProvider[]) {
    const allModelMappings: Map<string, Model> = new Map<string, Model>();
    const promises: Promise<void>[] = [];

    providers.forEach(provider => {
        const promise = provider.getModels()
            .then(models => {
                models.forEach(model => {
                    const key = `${model.provider}:${model.name}`
                    allModelMappings.set(key, model);
                })
            })
            .catch(error => {
                console.error(`Error fetching models from ${provider.name}:`, error);
            })
        promises.push(promise)
    })
    await Promise.all(promises)
    await storage.setItem<Map<string, Model>>('local:models', allModelMappings);
}

export async function getAllModels(): Promise<Map<string, Model>> {
    const allModels = await storage.getItem<Map<string, Model>>('local:models');
    return allModels || new Map<string, Model>()
}