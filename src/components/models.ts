import {AiProvider} from "@/components/providers/base";
import {getItem, setItem, StorageKeys} from "@/common/storage";

export class Model {
    constructor(
        public name: string = '',
        public provider: string = '',
        public enabled: boolean = true
    ) {
    }

    key(): string {
        return `${this.provider}:${this.name}`
    }

    populate(data: Partial<Model>) {
        if (data.name !== undefined) this.name = data.name;
        if (data.provider !== undefined) this.provider = data.provider;
        if (data.enabled !== undefined) this.enabled = data.enabled;
    }
}

/**
 * Fetches models from all provided AI providers and save them.
 * @param providers Array of AI providers.
 * @returns A flattened array of all models from all providers.
 */
export async function updateModels(providers: AiProvider[]) {
    const allModelMappings: { [key: string]: Model } = {};
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
    await setItem(StorageKeys.ModelMappings, allModelMappings);

    console.debug(`Saved: ${allModelMappings} models`)
}

export async function addModels(models: Model[]) {
    const modelMapping = await getAllModels();

    models.forEach(model => {
        modelMapping[model.key()] = model
    })
    await setItem(StorageKeys.ModelMappings, modelMapping);
}

export async function deleteModels(models: Model[]) {
    const modelMapping = await getAllModels();

    models.forEach(model => {
        delete modelMapping[model.key()]
    })
    await setItem(StorageKeys.ModelMappings, modelMapping);

}


export async function getAllModels(): Promise<{ [key: string]: Model }> {
    const allModelsString = await getItem(StorageKeys.ModelMappings);
    const allModelsObject: {[key: string]: object} = JSON.parse(allModelsString || '{}');
    const allModels: { [key: string]: Model } = {};

    Object.keys(allModelsObject).forEach(modelName => {
        const currModel = new Model();
        currModel.populate(allModelsObject[modelName]);
        allModels[modelName] = currModel
    });

    return allModelsString ? allModels : {};
}

// Update state of model of a given provider
export async function updateModelsState(providerName: string, state: boolean): Promise<void> {
    const modelMapping = await getAllModels()
    Object.keys(modelMapping).forEach(modelName => {
        if (modelName.startsWith(providerName)) {
            modelMapping[modelName].enabled = state
        }
    });
    await setItem(StorageKeys.ModelMappings, modelMapping);

    console.debug(`The status of provider '${providerName}' models were ${state ? 'enabled' : 'disabled'}`)
}
