import {AiProvider, BaseProvider} from "@/components/providers/provider";
import {Model} from "@/components/models";

export class GeminiProvider extends BaseProvider{
    name: string = 'Gemini';
    defaultUrl: string = 'https://gemini.google.com...';

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