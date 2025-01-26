import {AiProvider, Model} from "../../common/types";
import {performApiCall} from "../../common/api";

export const defaultOllamaUrl: string = 'http://localhost:11434';


export class OllamaProvider implements AiProvider {
    name: string = 'Ollama';
    enabled: boolean;
    key: string;
    url: string;
    connected: boolean = false;


    constructor(enabled: boolean = false, key: string = '', url: string = defaultOllamaUrl) {
        this.enabled = enabled;
        this.key = key
        this.url = url
    }

    async isConnected(): Promise<boolean> {
        const ollama = await storage.getItem<AiProvider>('local:ollama');
        if (ollama != null) {
            try {
                let resp = performApiCall('GET', `${ollama.url}/api/version'`, ollama.key)
            } catch (error) {
                return false;
            }
        }
        return false
    }

    async getModels(): Promise<Model[]> {
        const ollama = await storage.getItem<AiProvider>('local:ollama');
        if (ollama) {
            try {
                // Await the API call response
                const resp = await performApiCall('GET', `${ollama.url}/api/tags`, ollama.key);

                // Ensure the response contains the expected "models" property
                if (resp && Array.isArray(resp.models)) {
                    return resp.models.map((model: { name: string }) => new Model(model.name));
                }
            } catch (error) {
                console.error('Error fetching models:', error);
                return [];
            }
        }
        return [];
    }

    async stream(): Promise<string> {
        return "STREAM" //TBD
    }
}

