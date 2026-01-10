import {useEffect, useRef, useState} from 'preact/hooks';
import {getTabSession, settingsStorage, TabSession} from '@/lib/store';
import {useStorage} from '@/hooks/useStorage';
import {ProviderFactory} from '@/lib/providers/factory';
import {Model} from '@/lib/providers/types';
import {Cpu, MessageSquareText, Play, Settings, Sparkles} from 'lucide-preact';
import '@/assets/main.css';

export default function App() {
    const [currentTabId, setCurrentTabId] = useState<number | null>(null);
    const [settings, setSettings] = useStorage(settingsStorage);
    const [models, setModels] = useState<(Model & { providerId: string, providerName: string })[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) setCurrentTabId(tabs[0].id);
        });
    }, []);

    const sessionItem = currentTabId ? getTabSession(currentTabId) : null;
    const [session] = useStorage<TabSession>(sessionItem);

    useEffect(() => {
        if (!settings) return;
        const discoverModels = async () => {
            const allModels: (Model & { providerId: string, providerName: string })[] = [];
            const providers = [
                { id: 'ollama', name: 'Ollama', config: settings.providers.ollama },
                { id: 'gemini', name: 'Gemini', config: settings.providers.gemini }
            ];
            for (const p of providers) {
                if (p.config.enabled) {
                    try {
                        const provider = ProviderFactory.create(p.id as any, p.config);
                        const pModels = await provider.getModels();
                        allModels.push(...pModels.map(m => ({ ...m, providerId: p.id, providerName: p.name })));
                    } catch (e) { console.error(e); }
                }
            }
            setModels(allModels);
        };
        discoverModels();
    }, [settings?.providers]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages]);

    const handleExecute = async () => {
        if (!currentTabId || !settings?.selectedModelId) return;
        let pageContext = '';
        try {
            const response = await chrome.tabs.sendMessage(currentTabId, { type: 'SCRAPE_PAGE' });
            if (response?.success) pageContext = response.payload.content;
        } catch (e) { console.warn(e); }

        chrome.runtime.sendMessage({
            type: 'EXECUTE_PROMPT',
            payload: { tabId: currentTabId, userPrompt: "Summarize this page", pageContext }
        });
    };

    if (!session || !settings) return <div class="p-4 text-slate-500">Loading...</div>;
    const hasEnabledProviders = settings.providers.ollama.enabled || settings.providers.gemini.enabled;

    return (
        <div class="flex flex-col h-[550px] w-[400px] bg-slate-50">
            <header class="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
                <div class="flex items-center gap-2">
                    <Sparkles class="w-5 h-5 text-indigo-600" />
                    <h1 class="font-bold text-slate-800 text-lg">Companion</h1>
                </div>
                <button onClick={() => chrome.runtime.openOptionsPage()} class="p-1.5 text-slate-400 hover:text-indigo-600">
                    <Settings class="w-5 h-5" />
                </button>
            </header>

            <div class="p-4 space-y-3 bg-white border-b">
                <div class="flex items-center gap-3">
                    <div class="relative flex-1">
                        <Cpu class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            disabled={!hasEnabledProviders || models.length === 0}
                            value={settings.selectedModelId}
                            onChange={(e) => setSettings({ ...settings, selectedModelId: (e.target as HTMLSelectElement).value })}
                            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none outline-none"
                        >
                            <option value="">{!hasEnabledProviders ? 'No providers enabled' : 'Select a model...'}</option>
                            {models.map(m => (
                                <option key={`${m.providerId}:${m.id}`} value={`${m.providerId}:${m.id}`}>
                                    {m.name} ({m.providerName})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                        <MessageSquareText class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none outline-none">
                            <option value="summarize">Summarize this page</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleExecute}
                        disabled={!settings.selectedModelId || session.isLoading}
                        class="p-2.5 bg-indigo-600 text-white rounded-xl disabled:bg-slate-200"
                    >
                        <Play class="w-5 h-5 fill-current" />
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-4">
                {session.messages.map((m, i) => (
                    <div key={i} class={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div class={`max-w-[90%] px-4 py-3 rounded-2xl text-sm ${
                            m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-800'
                        }`}>
                            <div class="whitespace-pre-wrap">{m.content}</div>
                        </div>
                    </div>
                ))}
                {session.isLoading && <div class="text-xs text-indigo-400 animate-pulse">Thinking...</div>}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
