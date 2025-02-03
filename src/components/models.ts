import {AiProvider} from "@/components/providers/provider";

export class Model {
    constructor(
        public name: string,
        public provider: string
    ) {
    }
}

/**
 * Fetches models from all provided AI providers and save them.
 * @param providers Array of AI providers.
 * @returns A flattened array of all models from all providers.
 */
export async function updateModels(providers: AiProvider[]) {
    const allModels: Model[] = [];
    const promises: Promise<void>[] = [];

    providers.forEach(provider => {
        const promise = provider.getModels()
            .then(models => {
                allModels.push(...models);
            })
            .catch(error => {
                console.error(`Error fetching models from ${provider.name}:`, error);
            })
        promises.push(promise)
    })
    await Promise.all(promises)
    await storage.setItem<Model[]>('local:models', allModels);
}

export async function getAllModels(): Promise<Model[]> {
    const allModels = await storage.getItem<Model[]>('local:models');
    return allModels || []
}