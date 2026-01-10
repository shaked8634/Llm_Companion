import {BaseProvider} from './base';
import {OllamaProvider} from './ollama';
import {GeminiProvider} from './gemini';
import {ProviderConfig, ProviderType} from './types';

export class ProviderFactory {
    static create(type: ProviderType, config: ProviderConfig): BaseProvider {
        switch (type) {
            case 'ollama':
                return new OllamaProvider(config);
            case 'gemini':
                return new GeminiProvider(config);
            default:
                throw new Error(`Unknown provider type: ${type}`);
        }
    }
}
