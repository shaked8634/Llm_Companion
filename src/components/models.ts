import {AiProvider} from "@/components/providers/base";
import {getItem, setItem} from "@/common/storage";

export class Model {
    constructor(
        public name: string,
        public provider: string,
        public enabled: boolean = true
    ) {}
}

/**
 * Fetches models from all provided AI providers and save them.
 * @param providers Array of AI providers.
 * @returns A flattened array of all models from all providers.
 */
export async function updateModels(providers: AiProvider[]) {
    const allModelMappings: {[key: string]: Model} = {};
    const promises: Promise<void>[] = [];

    providers.forEach(provider => {
        const promise = provider.getModels()
            .then(models => {
                models.forEach(model => {
                    const key = `${model.provider}:${model.name}`
                    allModelMappings[key] = model;
                })
            })
            .catch(error => {
                console.error(`Error fetching models from ${provider.name}:`, error);
            })
        promises.push(promise)
    })
    await Promise.all(promises)
    await setItem('models', allModelMappings);

    console.debug(`Saved: ${allModelMappings} models`)
}

export async function getAllModels(): Promise<{ [key: string]: Model}> {
    const allModelsString: string = await getItem('models');

    return allModelsString ? JSON.parse(allModelsString) : {};
}

export async function updateModelsState(providerName: string, state: boolean): Promise<void> {
    const modelMapping = await getAllModels()
    Object.keys(modelMapping).forEach(modelName => {
       if (modelName.startsWith(providerName)) {
           modelMapping[modelName].enabled = state
       }
    });
    await setItem('models', modelMapping);

    console.debug(`The status of provider '${providerName}' models were ${state ? 'enabled' : 'disabled'}`)
}
