import {Model} from "@/components/models";

export interface AiProvider {
    name: string
    url: string;
    enabled: boolean;
    key: string;
    defaultUrl: string;

    isConnected(): Promise<boolean>;
    getModels(): Promise<Model[]>;
    stream(model: string, prompt: string): Promise<string>;
}

export abstract class BaseProvider implements AiProvider {
    abstract name: string;
    abstract defaultUrl: string;

    constructor(
        public url: string = this.getDefaultUrl(),
        public enabled: boolean = false,
        public key: string = '',
    ) {}

    populate(data: Partial<BaseProvider>) {
        if (data.url !== undefined) this.url = data.url;
        if (data.enabled !== undefined) this.enabled = data.enabled;
        if (data.key !== undefined) this.key = data.key;
    }

    private getDefaultUrl(): string {
        return this.defaultUrl;
    }

    abstract isConnected(): Promise<boolean>;
    abstract getModels(): Promise<Model[]>;
    abstract stream(model: string, prompt: string): Promise<string>;

}
