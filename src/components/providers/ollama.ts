import {performApiCall} from "@/common/api";
import {BaseProvider} from "@/components/providers/base";
import {Model} from "@/components/models";
import {ProviderType} from "@/components/providers/types";

interface ApiVersionResponse {
    version: string;
}

interface ApiModelsResp {
    models: [];
}

interface ApiChatResp {
    model: string
    created_at: string
    response: string
    done: boolean
    done_reason: string
    context: number[]  // the encoded conversation to be used as memory
    total_duration: number
    load_duration: number
    prompt_eval_count: number
    prompt_eval_duration: number
    eval_count: number
    eval_duration: number
}

const ctxSize = 4096;

export class OllamaProvider extends BaseProvider {
    name: string = ProviderType.Ollama;
    defaultUrl: string = 'http://localhost:11434';

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
            const resp = await performApiCall('GET', `${this.url}/api/tags`, this.key) as ApiModelsResp;

            if (resp && resp?.models) {
                return resp.models.map((model: { name: string, provider: string }) => new Model(model.name, this.name));
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
        return [];
    }

    async stream(model: string, prompt: string): Promise<string> {
        const body = {
            model: model,
            prompt: prompt,
            stream: false,
            options: {"num_ctx": ctxSize}
        }
        try {
            const resp = await performApiCall('POST', `${this.url}/api/generate`, this.key, body) as ApiChatResp;
            // let result = '';
            //
            // for (const chunk of resp.response) {
            //     const parsedChunk = JSON.parse(chunk); // Parse each chunk as JSON
            //     result += parsedChunk.response; // Append the response to the result
            //     console.log('Received chunk:', parsedChunk); // Log each chunk for debugging
            //     if (parsedChunk.done) {
            //         console.log('Stream completed.'); // Log when the stream is done
            //         break; // Exit the loop if the stream is done
            //     }
            // }
            return resp.response;
        } catch (error) {
            console.error('Error getting response:', error);
        }
        return '';
    }
}

