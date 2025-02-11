import {performApiCall} from "@/common/api";
import {BaseProvider} from "@/components/providers/base";
import {Model} from "@/components/models";
import {ProviderType} from "@/components/providers/types";

interface ApiVersionResponse {
    version: string;
}

interface ApiModelsResponse {
    models: [];
}

export class OllamaProvider extends BaseProvider {
    name: string = ProviderType.Ollama;
    static defaultUrl: string = 'http://localhost:11434';

    async isConnected(): Promise<boolean> {
        try {
            const resp = await performApiCall('GET', `${this.url}/api/version`, this.key) as ApiVersionResponse;

            if (resp && resp?.version) {
                return true
            }
        } catch (error) {
            return false;
        }

        return false
    }

    async getModels(): Promise<Model[]> {
        try {
            const resp = await performApiCall('GET', `${this.url}/api/tags`, this.key) as ApiModelsResponse;

            if (resp && resp?.models) {
                return resp.models.map((model: { name: string, provider: string }) => new Model(model.name, this.name));
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
        return [];
    }

    async stream(): Promise<string> {
        return "STREAM" //TBD
    }
}

