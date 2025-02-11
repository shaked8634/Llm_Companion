import {Model} from "@/components/models";

export interface AiProvider {
    name: string
    url: string;
    enabled: boolean;
    key: string;

    isConnected(): Promise<boolean>;
    getModels(): Promise<Model[]>;
    stream(): Promise<string>;
}

export abstract class BaseProvider implements AiProvider {
    abstract name: string;
    static defaultUrl: string = '';

    constructor(
        public url: string = ((this.constructor as typeof BaseProvider).defaultUrl || ''),
        public enabled: boolean = false,
        public key: string = '',
    ) {}

    populate(data: Partial<BaseProvider>) {
        if (data.url !== undefined) this.url = data.url;
        if (data.enabled !== undefined) this.enabled = data.enabled;
        if (data.key !== undefined) this.key = data.key;
    }

    abstract isConnected(): Promise<boolean>;
    abstract getModels(): Promise<Model[]>;
    abstract stream(): Promise<string>;

}

// export async function loadProvider(providerName: string) {
//     try {
//         const providerData = await storage.getItem<string>(`local:${[ProviderType.Openai]}`);
//
//         return BaseProvider.hydrate(providerData)
//     } catch (error) {
//         console.error('Error loading Provider:', error);
//     }
// }
