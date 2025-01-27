import {Model} from "@/common/types";

export interface AiProvider {
    name: string
    enabled: boolean;
    key: string;
    url: string;
    connected: boolean;

    isConnected(): Promise<boolean>;
    getModels(): Promise<Model[]>;
    stream(): Promise<string>;
}

export abstract class BaseProvider implements AiProvider {
    abstract name: string;
    static defaultUrl: string;
    connected: boolean = false;

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
    //
    // abstract isConnected(): Promise<boolean>;
    // abstract getModels(): Promise<Model[]>;
    // abstract stream(): Promise<string>;
}

// export function hydrateProvider<T extends BaseProvider>(
//     ProviderClass: new (...args: any[]) => T,
//     storedData: Partial<T> | null
// ): T {
//     return ProviderClass.hydrate(storedData || {});
// }