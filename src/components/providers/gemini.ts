import {AiProvider, Model} from "@/common/types";

const defaultGeminiUrl: string = 'http://localhost:11434';

export class GeminiProvider implements AiProvider {
    name: string = 'Gemini';
    enabled: boolean;
    key: string;
    url: string;
    connected: boolean = false;


    constructor(enabled: boolean = false, key: string = '') {
        this.enabled = enabled;
        this.key = key
        this.url = defaultGeminiUrl
    }

    async isConnected(): Promise<boolean> {
        return false
    }

    async getModels(): Promise<Model[]> {
        return []
    }

    async stream(): Promise<string> {
        return "STREAM" //TBD
    }
}