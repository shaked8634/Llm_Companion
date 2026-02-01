import {ProviderFactory} from '../providers/factory';
import {DiscoveredModel, settingsStorage} from '../store';

export async function refreshDiscoveredModels() {
    console.log('[Discovery] Refreshing models...');
    const settings = await settingsStorage.getValue();
    const allModels: DiscoveredModel[] = [];
    
    const providers = [
        { id: 'ollama', name: 'Ollama', config: settings.providers.ollama },
        { id: 'gemini', name: 'Gemini', config: settings.providers.gemini },
        { id: 'openai', name: 'OpenAI', config: settings.providers.openai }
    ];

    for (const p of providers) {
        if (p.config.enabled) {
            try {
                const provider = ProviderFactory.create(p.id as any, p.config);
                const pModels = await provider.getModels();
                allModels.push(...pModels.map(m => ({ 
                    ...m, 
                    providerId: p.id, 
                    providerName: p.name 
                })));
            } catch (e) { 
                console.error(`[Discovery] Failed to fetch models for ${p.id}:`, e); 
            }
        }
    }

    const previous = settings.discoveredModels || [];
    const unchanged = previous.length === allModels.length && previous.every((m, idx) => {
        const n = allModels[idx];
        return m.id === n.id && m.providerId === n.providerId && m.name === n.name;
    });

    if (unchanged) {
        return;
    }

    await settingsStorage.setValue({
        ...settings,
        discoveredModels: allModels
    });
    console.log(`[Discovery] Successfully discovered ${allModels.length} models`);
}
