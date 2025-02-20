import {Model} from "@/components/models";

export interface AiProvider {
    name: string
    url: string;
    enabled: boolean;
    key: string;

    isConnected(): Promise<boolean>;
    getModels(): Promise<Model[]>;
    stream(model: string, prompt: string): Promise<string>;
}

export abstract class BaseProvider implements AiProvider {
    abstract name: string;
    static defaultUrl: string;

    constructor(
        public url: string = '',
        public enabled: boolean = false,
        public key: string = '',
    ) {
        if (!this.url) {
            const constructorAsAny = (this.constructor as any);
            this.url = constructorAsAny.defaultUrl ?? '';
        }
    }

    populate(data: Partial<BaseProvider>) {
        if (data.url !== undefined) this.url = data.url;
        if (data.enabled !== undefined) this.enabled = data.enabled;
        if (data.key !== undefined) this.key = data.key;
    }

    abstract isConnected(): Promise<boolean>;
    abstract getModels(): Promise<Model[]>;
    abstract stream(model: string, prompt: string): Promise<string>;
}
