export interface AiProvider {
    name: string
    enabled: boolean;
    key: string;
    url: string;
    connected: boolean;

    isConnected(): Promise<boolean>;
    getModels(): Promise<Model[]>
    stream(): Promise<string>

}

export class Model {
    constructor(
        public name: string
    ) {}
}

export class Prompt {
    constructor(
        public enabled: boolean = false,
        public prompt: string = '',
        public defaultPrompt: string = '',
    ) {}
}
