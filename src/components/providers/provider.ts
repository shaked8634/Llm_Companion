import {Model} from "@/components/models";

export enum ProviderType {
    Openai = 'Openai',
    Gemini = 'Gemini',
    Ollama = 'Ollama'
}

export interface AiProvider {
    name: string
    enabled: boolean;
    key: string;
    url: string;

    isConnected(): Promise<boolean>;
    getModels(): Promise<Model[]>;
    stream(): Promise<string>;
}

export abstract class BaseProvider implements AiProvider {
    abstract name: string;
    static defaultUrl: string;

    constructor(
        public url: string = '',
        public key: string = '',
        public enabled: boolean = false
    ) {
        this.enabled = enabled;
        this.key = key;
        this.url = url ? url : BaseProvider.defaultUrl;
    }

    abstract isConnected(): Promise<boolean>;
    abstract getModels(): Promise<Model[]>;
    abstract stream(): Promise<string>;

    static hydrate<T extends BaseProvider>(
        this: new (...args: any[]) => T,
        data: Partial<T>
    ): T {
        return new this(
            data.enabled ?? false,
            data.key ?? '',
            data.url ?? this.prototype.defaultUrl
        );
    }
}
