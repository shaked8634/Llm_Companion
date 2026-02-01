import {useEffect, useRef, useState} from 'preact/hooks';
import {AppSettings, Prompt, PromptType, settingsStorage} from '@/lib/store';
import {useStorage} from '@/hooks/useStorage';
import {Bot, CheckCircle2, Copy, FileText, Info, Plus, Trash2, XCircle} from 'lucide-preact';
import '@/assets/main.css';

type TabId = 'models' | 'prompts' | 'about';

export default function Options() {
    const [settings, setSettings] = useStorage(settingsStorage);
    const [activeTab, setActiveTab] = useState<TabId>('models');

    // Local state for providers to prevent flickering from storage updates
    const [localProviders, setLocalProviders] = useState<AppSettings['providers'] | null>(null);
    const providersInitialized = useRef(false);

    // Initialize local providers once from settings
    useEffect(() => {
        if (settings?.providers && !providersInitialized.current) {
            setLocalProviders(settings.providers);
            providersInitialized.current = true;
        }
    }, [settings?.providers]);

    // Local state for prompts to avoid instant save conflicts
    const [localPrompts, setLocalPrompts] = useState<Prompt[]>([]);
    const saveTimeoutRef = useRef<number>();

    // Sync local prompts with settings
    useEffect(() => {
        if (settings?.prompts) {
            setLocalPrompts(settings.prompts);
        }
    }, [settings?.prompts]);

    // Debounced save function
    const debouncedSavePrompts = (prompts: Prompt[]) => {
        setLocalPrompts(prompts);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = window.setTimeout(() => {
            if (settings) {
                setSettings({...settings, prompts});
            }
        }, 500);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Validation state for provider fields
    const [providerErrors, setProviderErrors] = useState<{ [key: string]: string }>({});

    // Patch settings to ensure all providers exist (one-time migration)
    useEffect(() => {
        if (!settings || !localProviders) return;
        let changed = false;
        const patchedProviders = {...localProviders};
        if (!patchedProviders.ollama) {
            patchedProviders.ollama = {enabled: true, url: 'http://localhost:11434'};
            changed = true;
        }
        if (!patchedProviders.gemini) {
            patchedProviders.gemini = {enabled: false, apiKey: ''};
            changed = true;
        }
        if (!patchedProviders.openai) {
            patchedProviders.openai = {enabled: false, apiKey: ''};
            changed = true;
        }
        if (changed) {
            setLocalProviders(patchedProviders);
            setSettings({...settings, providers: patchedProviders});
        }
    }, [localProviders]);

    // Derive provider status from discoveredModels (set by background)
    const getProviderStatus = (providerId: string): 'idle' | 'success' | 'error' => {
        if (!settings || !localProviders) return 'idle';
        const config = localProviders[providerId as keyof AppSettings['providers']];
        // Return idle if provider is disabled (clears status immediately on uncheck)
        if (!config?.enabled) return 'idle';

        const hasModels = settings.discoveredModels?.some(m => m.providerId === providerId);
        return hasModels ? 'success' : 'idle';
    };

    if (!settings) return <div class="p-8 text-slate-500 font-medium">Loading settings...</div>;

    if (!settings.prompts) {
        setSettings({
            ...settings,
            prompts: [
                {
                    id: 'default-summarize',
                    name: 'Summarize this page',
                    text: 'Summarize this page with less than 500 words',
                    type: PromptType.WITH_WEBPAGE,
                    isDefault: true
                }
            ]
        });
        return <div class="p-8 text-slate-500 font-medium">Loading settings...</div>;
    }

    function validateProvider(id: keyof AppSettings['providers'], config: any) {
        let error = '';
        if (config.enabled) {
            if ((id === 'gemini' || id === 'openai') && !config.apiKey) {
                error = 'API Key is required.';
            }
            if (id === 'ollama' && (!config.url || !/^https?:\/\/.+/.test(config.url))) {
                error = 'Valid URL is required.';
            }
        }
        setProviderErrors(prev => ({...prev, [id]: error}));
        return !error;
    }

    const updateProvider = (id: keyof AppSettings['providers'], updates: any) => {
        if (!localProviders || !settings) return;

        const newProviders = {
            ...localProviders,
            [id]: {...localProviders[id], ...updates}
        };

        // Only validate when disabling or when updating API keys/URLs (not just enabling)
        const isEnablingOnly = updates.enabled === true && Object.keys(updates).length === 1;
        if (!isEnablingOnly && !validateProvider(id, newProviders[id])) {
            return;
        }

        if (updates.enabled === false) {
            setProviderErrors(prev => ({...prev, [id]: ''}));
        } else if (isEnablingOnly) {
            setProviderErrors(prev => ({...prev, [id]: ''}));
        }

        // Update local state immediately for responsive UI
        setLocalProviders(newProviders);

        // Save to storage (will trigger background model discovery)
        const newSettings = {...settings, providers: newProviders};
        if (updates.enabled === false) {
            // Clear selected model if it belongs to this provider
            if (settings.selectedModelId?.startsWith(`${id}:`)) {
                newSettings.selectedModelId = '';
            }
            // Clear discovered models for this provider immediately
            newSettings.discoveredModels = (settings.discoveredModels || []).filter(
                m => m.providerId !== id
            );
        }
        setSettings(newSettings);
    };

    const tabs = [
        {id: 'models', label: 'Providers', icon: Bot},
        {id: 'prompts', label: 'Prompts', icon: FileText},
        {id: 'about', label: 'About', icon: Info},
    ] as const;

    return (
        <div
            class="flex min-h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 gap-4">
            <aside class="w-44 flex flex-col shrink-0">
                <nav class="flex flex-col gap-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            class={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm font-bold scale-[1.02]'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 font-medium'
                            }`}
                        >
                            <tab.icon class={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'text-indigo-600' : ''}`}/>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <main class="flex-1 bg-slate-100 dark:bg-slate-950">
                <div class="w-full px-4">
                    {activeTab === 'models' && (
                        <div class="space-y-8">
                            <div class="w-full">
                                <table class="w-full border-separate border-spacing-y-4 border-spacing-x-2 -ml-2"
                                       style="table-layout: fixed;">
                                    <colgroup>
                                        <col style="width: 80px;"/>
                                        <col style="width: 120px;"/>
                                        <col style="width: auto;"/>
                                        <col style="width: auto;"/>
                                        <col style="width: 80px;"/>
                                    </colgroup>
                                    <thead>
                                    <tr>
                                        <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-center">Enable</th>
                                        <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">Provider</th>
                                        <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">API
                                            Key
                                        </th>
                                        <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">URL</th>
                                        <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-center">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {localProviders && (['ollama', 'gemini', 'openai'] as const).map((id) => {
                                        const config = localProviders[id];
                                        if (!config) return null;
                                        const isDisabled = !config.enabled;
                                        const status = getProviderStatus(id);
                                        return (
                                            <tr key={id}>
                                                <td class="text-center">
                                                    <div class="flex items-center justify-center h-10">
                                                        <input type="checkbox" checked={config.enabled}
                                                               onChange={(e) => {
                                                                   const isEnabled = (e.target as HTMLInputElement).checked;
                                                                   if (!isEnabled) {
                                                                       updateProvider(id, {
                                                                           enabled: false,
                                                                           apiKey: '',
                                                                           url: ''
                                                                       });
                                                                   } else {
                                                                       const enableUpdates: any = {enabled: true};
                                                                       if (id === 'ollama') {
                                                                           enableUpdates.url = 'http://localhost:11434';
                                                                       }
                                                                       updateProvider(id, enableUpdates);
                                                                   }
                                                               }}
                                                               class="w-5 h-5 rounded-lg text-indigo-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all cursor-pointer"/>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="flex items-center h-10 px-4">
                                                        <span
                                                            class={`font-bold capitalize text-base ${isDisabled ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-slate-100'}`}>{id}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="password" value={config.apiKey || ''}
                                                           disabled={isDisabled}
                                                           onInput={(e) => updateProvider(id, {apiKey: (e.target as HTMLInputElement).value})}
                                                           placeholder="API Key"
                                                           class={`w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm transition-all ${isDisabled ? 'opacity-40 grayscale' : 'shadow-sm focus:ring-2 focus:ring-indigo-500/20'} ${id !== 'ollama' && !config.apiKey && !isDisabled ? 'border-amber-300' : 'border-slate-200 dark:border-slate-800'} ${providerErrors[id] ? 'border-red-500' : ''}`}/>
                                                    {providerErrors[id] && id !== 'ollama' && (
                                                        <div
                                                            class="text-xs text-red-500 mt-1">{providerErrors[id]}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    {id === 'ollama' ? (
                                                        <div>
                                                            <input type="text" value={config.url || ''}
                                                                   disabled={isDisabled}
                                                                   onInput={(e) => updateProvider(id, {url: (e.target as HTMLInputElement).value})}
                                                                   class={`w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm transition-all ${isDisabled ? 'opacity-40 grayscale' : 'shadow-sm focus:ring-2 focus:ring-indigo-500/20'} border-slate-200 dark:border-slate-800 ${providerErrors[id] ? 'border-red-500' : ''}`}/>
                                                            {providerErrors[id] && (
                                                                <div
                                                                    class="text-xs text-red-500 mt-1">{providerErrors[id]}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div class="w-full h-10"/>
                                                    )}
                                                </td>
                                                <td class="text-center">
                                                    {config.enabled && (
                                                        <div class="flex items-center justify-center h-10">
                                                            {status === 'success' &&
                                                                <CheckCircle2 class="w-5 h-5 text-green-500"/>}
                                                            {status === 'error' &&
                                                                <XCircle class="w-5 h-5 text-red-500"/>}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'prompts' && (
                        <div class="space-y-8">
                            <div class="w-full">
                                <table class="w-full border-separate border-spacing-y-4 border-spacing-x-2 -ml-2"
                                       style="table-layout: fixed;">
                                    <colgroup>
                                        <col style="width: 180px;"/>
                                        <col style="width: 180px;"/>
                                        <col style="width: auto;"/>
                                        <col style="width: 60px;"/>
                                    </colgroup>
                                    <thead>
                                    <tr>
                                        <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">Name</th>
                                        <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">Type</th>
                                        <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">Prompt
                                            Text
                                        </th>
                                        <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-center">Action</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {localPrompts.map((prompt) => (
                                        <tr key={prompt.id}>
                                            <td class="align-top">
                                                <input
                                                    type="text"
                                                    value={prompt.name}
                                                    maxLength={30}
                                                    onInput={(e) => {
                                                        const newPrompts = localPrompts.map(p =>
                                                            p.id === prompt.id ? {
                                                                ...p,
                                                                name: (e.target as HTMLInputElement).value
                                                            } : p
                                                        );
                                                        debouncedSavePrompts(newPrompts);
                                                    }}
                                                    class={`w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm transition-all shadow-sm focus:ring-2 focus:ring-indigo-500/20 ${
                                                        !prompt.name.trim() ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                                                    }`}
                                                />
                                                {!prompt.name.trim() && (
                                                    <div class="text-xs text-red-500 mt-1">Name is required</div>
                                                )}
                                            </td>
                                            <td class="align-top">
                                                <select
                                                    value={prompt.type || PromptType.WITH_WEBPAGE}
                                                    onChange={(e) => {
                                                        const newPrompts = localPrompts.map(p =>
                                                            p.id === prompt.id ? {
                                                                ...p,
                                                                type: (e.target as HTMLSelectElement).value as PromptType
                                                            } : p
                                                        );
                                                        debouncedSavePrompts(newPrompts);
                                                    }}
                                                    class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm transition-all shadow-sm focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                                >
                                                    <option value={PromptType.WITH_WEBPAGE}>With Webpage</option>
                                                    <option value={PromptType.FREE_TEXT}>Free Text</option>
                                                    <option value={PromptType.SELECTED_TEXT}>Selected Text</option>
                                                </select>
                                            </td>
                                            <td class="align-top">
                                                    <textarea
                                                        value={prompt.text}
                                                        maxLength={1000}
                                                        onInput={(e) => {
                                                            const newPrompts = localPrompts.map(p =>
                                                                p.id === prompt.id ? {
                                                                    ...p,
                                                                    text: (e.target as HTMLTextAreaElement).value
                                                                } : p
                                                            );
                                                            debouncedSavePrompts(newPrompts);
                                                        }}
                                                        rows={3}
                                                        class={`w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm transition-all shadow-sm focus:ring-2 focus:ring-indigo-500/20 resize-y min-h-[80px] ${
                                                            !prompt.text.trim() ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                                                        }`}
                                                    />
                                                {!prompt.text.trim() && (
                                                    <div class="text-xs text-red-500 mt-1">Prompt text is required</div>
                                                )}
                                            </td>
                                            <td class="text-center align-top">
                                                <div class="flex items-start justify-center pt-2.5">
                                                    <button
                                                        onClick={() => {
                                                            if (!prompt.isDefault) {
                                                                const newPrompts = localPrompts.filter(p => p.id !== prompt.id);
                                                                setLocalPrompts(newPrompts);
                                                                if (settings) {
                                                                    setSettings({...settings, prompts: newPrompts});
                                                                }
                                                            }
                                                        }}
                                                        disabled={prompt.isDefault}
                                                        class={`p-2 rounded-lg transition-all ${
                                                            prompt.isDefault
                                                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                                                : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 cursor-pointer'
                                                        }`}
                                                    >
                                                        <Trash2 class="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div class="flex justify-end">
                                <button
                                    onClick={() => {
                                        const newPrompt: Prompt = {
                                            id: `prompt-${Date.now()}`,
                                            name: 'New Prompt',
                                            text: '',
                                            type: PromptType.WITH_WEBPAGE,
                                            isDefault: false
                                        };
                                        const newPrompts = [...localPrompts, newPrompt];
                                        setLocalPrompts(newPrompts);
                                        if (settings) {
                                            setSettings({...settings, prompts: newPrompts});
                                        }
                                    }}
                                    class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                                >
                                    <Plus class="w-4 h-4"/>
                                    <span>Add Prompt</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div class="space-y-6">
                            <div
                                class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                                <div class="text-center space-y-1">
                                    <p class="text-2xl font-bold text-slate-900 dark:text-slate-100">LLM Companion</p>
                                    <p class="text-sm text-slate-600 dark:text-slate-300">An Open Source Extension
                                        harnessing local and cloud LLM power in the browsers</p>
                                </div>
                                <div class="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Repository</h3>
                                        <p class="text-sm text-slate-600 dark:text-slate-300">
                                            <a href="https://forgejo.o-st.dev/ozzt/Llm_companion" target="_blank"
                                               rel="noopener noreferrer"
                                               class="text-indigo-600 dark:text-indigo-400 hover:underline">Forgejo</a>
                                        </p>
                                    </div>

                                    <div>
                                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Support
                                            Development</h3>
                                        <div class="space-y-2">
                                            {[
                                                {
                                                    name: 'Bitcoin',
                                                    addr: 'bc1q40kq55283px33xv5hqms94hf8mk7rc52h294wz',
                                                    symbol: 'BTC',
                                                    mime: 'bitcoin:bc1q40kq55283px33xv5hqms94hf8mk7rc52h294wz'
                                                },
                                                {
                                                    name: 'Ethereum',
                                                    addr: '0x15735a6c937A836688A00dfC8BB2Ea1261B9fB5A',
                                                    symbol: 'ETH',
                                                    mime: 'ethereum:0x15735a6c937A836688A00dfC8BB2Ea1261B9fB5A'
                                                },
                                                {
                                                    name: 'Solana',
                                                    addr: 'HNcSiKXhJVpSdF9BA2ZugfS1rsNNpWLwJRpzk3NbDDxn',
                                                    symbol: 'SOL',
                                                    mime: 'solana:HNcSiKXhJVpSdF9BA2ZugfS1rsNNpWLwJRpzk3NbDDxn'
                                                },
                                                {
                                                    name: 'Monero',
                                                    addr: '42TdDbz5tCj4f2Dmap8NVVXCMc8VWZEZ4LCrDC9LbPEuPLkZivN8zFTCZt5iJ1xmGufo4UH5r28KGHVLWHWE5sqzSdVnWY8',
                                                    symbol: 'XMR',
                                                    mime: 'monero:42TdDbz5tCj4f2Dmap8NVVXCMc8VWZEZ4LCrDC9LbPEuPLkZivN8zFTCZt5iJ1xmGufo4UH5r28KGHVLWHWE5sqzSdVnWY8'
                                                }
                                            ].map(crypto => (
                                                <div key={crypto.symbol}
                                                     class="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                                    <div class="flex-1 min-w-0">
                                                        <a href={crypto.mime}
                                                           class="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline break-all">
                                                            <span
                                                                class="font-bold">{crypto.symbol}:</span> {crypto.addr}
                                                        </a>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(crypto.addr);
                                                        }}
                                                        title={`Copy ${crypto.name} address`}
                                                        class="ml-3 p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Copy class="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                                        <p class="text-xs text-slate-400 dark:text-slate-600 text-right">v0.0.0</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
