import {Model} from "@/components/models";

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
        public enabled: boolean = false,
        public key: string = '',
        public url: string = ''
    ) {
        this.enabled = enabled;
        this.key = key;
        this.url = url;
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
