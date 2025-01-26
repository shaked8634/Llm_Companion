import {AiProvider, Model} from "@/common/types";

const defaultOllamaUrl: string = 'https://api.openai.com';

export class OpenaiProvider implements AiProvider {
    name: string = "OpenAI"
    enabled: boolean;
    key: string;
    url: string;
    connected: boolean = false;

    constructor(enabled: boolean = false, key: string = '') {
        this.enabled = enabled;
        this.key = key
        this.url = defaultOllamaUrl
    }

    async isConnected(): Promise<boolean> {
        return true
    }

     async getModels(): Promise<Model[]> {
        return []
     }

     async stream(): Promise<string> {
        return "STREAM" //TBD
    }
}