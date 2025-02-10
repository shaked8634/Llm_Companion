import {BaseProvider} from "@/components/providers/base";
import {Model} from "@/components/models";
import {ProviderType} from "@/components/providers/provider";

export class GeminiProvider extends BaseProvider{
    name: string = ProviderType.Gemini;
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