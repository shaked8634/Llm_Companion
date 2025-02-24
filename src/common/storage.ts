
export enum StorageKeys {
    ProviderMappings = 'ProviderMappings',
    PromptMappings = 'PromptMappings',
    ModelMappings = 'ModelMappings',
    LastOutput = 'LastOutput',
    CurrModel = 'CurrModel',
    CurrPrompt = 'CurrPrompt',
    Version = 'Version',
}

export async function getItem(objectName: string): Promise<string> {
    return await storage.getItem(`local:${objectName}`) || '';
}

export async function setItem(objectName: string, obj: any) {
    let val;
    if (['boolean', 'string', 'number'].includes(typeof obj)) {
        val = obj;
    } else {
        val = JSON.stringify(obj);
    }

    await storage.setItem(`local:${objectName}`, val);
}
