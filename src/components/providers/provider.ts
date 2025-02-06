import {Model} from "@/components/models";

export enum ProviderType {
    Openai = 'Openai',
    Gemini = 'Gemini',
    Ollama = 'Ollama'
}

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

    abstract isConnected(): Promise<boolean>;
    abstract getModels(): Promise<Model[]>;
    abstract stream(): Promise<string>;

    static hydrate<T extends BaseProvider>(
        this: new (...args: any[]) => T,
        data: Partial<T>
    ): T {
        return new this(
            data.url ?? '',
            data.enabled ?? false,
            data.key ?? '',
        );
    }
}
