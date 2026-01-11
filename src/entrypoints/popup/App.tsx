import {useEffect, useRef, useState} from 'preact/hooks';
import {getTabSession, settingsStorage, TabSession} from '@/lib/store';
import {useStorage} from '@/hooks/useStorage';
import {ProviderFactory} from '@/lib/providers/factory';
import {Model} from '@/lib/providers/types';
import {Cpu, MessageSquareText, Play, Settings, Sparkles, Trash2} from 'lucide-preact';
import '@/assets/main.css';

interface PageContent {
    [key: string]: unknown;
}

export default function App() {
    const [currentTabId, setCurrentTabId] = useState<number | null>(null);
    const [settings, setSettings] = useStorage(settingsStorage);
    const [models, setModels] = useState<(Model & { providerId: string, providerName: string })[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string>('');
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
        if (!currentTabId || !settings?.selectedModelId || !selectedPrompt) return;
        const prompt = settings.prompts?.find(p => p.id === selectedPrompt);
        if (!prompt) return;

        let pageContent: PageContent | null = null;
        try {
            const response = await chrome.tabs.sendMessage(currentTabId, { type: 'SCRAPE_PAGE' });
            if (response?.success) {
                pageContent = response.payload as PageContent;
            }
        } catch (e) {
            console.warn(e);
        }

        chrome.runtime.sendMessage({
            type: 'EXECUTE_PROMPT',
            payload: {
                tabId: currentTabId,
                userPrompt: prompt.text,
                pageContext: pageContent ? JSON.stringify(pageContent) : ''
            }
        });
    };

    const clearHistory = () => {
        if (sessionItem) {
            sessionItem.setValue({ messages: [], isLoading: false });
        }
    };

    if (!session || !settings) return <div class="p-4 text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-900">Loading...</div>;
    const hasEnabledProviders = settings.providers.ollama.enabled || settings.providers.gemini.enabled;
    const prompts = settings.prompts || [];

    // Auto-select first prompt if none selected
    if (!selectedPrompt && prompts.length > 0) {
        setSelectedPrompt(prompts[0].id);
    }

    return (
        <div class="flex flex-col w-[500px] bg-slate-100 dark:bg-slate-950">
            {/* Header */}
            <header class="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div class="flex items-center gap-2">
                    <Sparkles class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span class="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight">LLM Companion</span>
                </div>
                <div class="flex items-center gap-1">
                    {session.messages.length > 0 && (
                        <button onClick={clearHistory} class="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all">
                            <Trash2 class="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* Controls Grid */}
            <div class="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2">
                {/* Row 1: Models + Settings */}
                <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                        <Cpu class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <select
                            disabled={!hasEnabledProviders || models.length === 0}
                            value={settings.selectedModelId}
                            onChange={(e) => setSettings({ ...settings, selectedModelId: (e.target as HTMLSelectElement).value })}
                            class="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer disabled:opacity-50"
                        >
                            <option value="">{!hasEnabledProviders ? 'No providers' : 'Select model...'}</option>
                            {models.map(m => (
                                <option key={`${m.providerId}:${m.id}`} value={`${m.providerId}:${m.id}`}>
                                    {m.name} ({m.providerName})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button 
                        onClick={() => chrome.runtime.openOptionsPage()} 
                        class="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all shrink-0"
                    >
                        <Settings class="w-4 h-4" />
                    </button>
                </div>

                {/* Row 2: Prompts + Execute */}
                <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                        <MessageSquareText class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <select
                            value={selectedPrompt}
                            onChange={(e) => setSelectedPrompt((e.target as HTMLSelectElement).value)}
                            disabled={prompts.length === 0}
                            class="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs appearance-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {prompts.length === 0 ? (
                                <option value="">No prompts available</option>
                            ) : (
                                prompts.map(prompt => (
                                    <option key={prompt.id} value={prompt.id}>{prompt.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <button 
                        onClick={handleExecute}
                        disabled={!settings.selectedModelId || session.isLoading || !selectedPrompt}
                        class="p-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all shrink-0"
                    >
                        <Play class="w-4 h-4 fill-current" />
                    </button>
                </div>
            </div>

            {/* Output Box */}
            {(session.messages.length > 0 || session.isLoading) && (
                <div class="flex-1 overflow-y-auto p-4 flex flex-col max-h-[500px]">
                    <div class="space-y-4">
                    {session.messages.map((m, i) => (
                        <div key={i} class={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div class={`max-w-[90%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm transition-colors ${
                                m.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                            }`}>
                                <div class="whitespace-pre-wrap">{m.content}</div>
                            </div>
                        </div>
                ))}

                    {session.isLoading && (
                        <div class="flex justify-start animate-pulse">
                            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl rounded-tl-none">
                                <div class="flex gap-1">
                                    <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                    <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                    </div>
                </div>
            )}
        </div>
    );
}
