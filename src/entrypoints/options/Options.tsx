import {useEffect, useRef, useState} from 'preact/hooks';
import {AppSettings, Prompt, settingsStorage} from '@/lib/store';
import {useStorage} from '@/hooks/useStorage';
import {ProviderFactory} from '@/lib/providers/factory';
import {Bot, CheckCircle2, FileText, Info, Loader2, Plus, Trash2, XCircle} from 'lucide-preact';
import '@/assets/main.css';

type TabId = 'models' | 'prompts' | 'about';
type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';
type VerificationState = Record<string, VerificationStatus>;

export default function Options() {
    const [settings, setSettings] = useStorage(settingsStorage);
    const [activeTab, setActiveTab] = useState<TabId>('models');
    const [verification, setVerification] = useState<VerificationState>({
        ollama: 'idle',
        gemini: 'idle',
        openai: 'idle'
    });

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
                setSettings({ ...settings, prompts });
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

    const verifyProvider = async (id: string, config: any) => {
        if (!config.enabled) {
            setVerification(prev => ({ ...prev, [id]: 'idle' }));
            return;
        }

        setVerification(prev => ({ ...prev, [id]: 'loading' }));
        try {
            const provider = ProviderFactory.create(id as any, config);
            const models = await provider.getModels();
            if (models && models.length > 0) {
                setVerification(prev => ({ ...prev, [id]: 'success' }));
            } else {
                setVerification(prev => ({ ...prev, [id]: 'error' }));
            }
        } catch (e) {
            console.error(`Verification failed for ${id}:`, e);
            setVerification(prev => ({ ...prev, [id]: 'error' }));
        }
    };

    const refreshModels = () => {
        if (!settings) return;
        ['ollama', 'gemini', 'openai'].forEach(id => {
            const config = settings.providers[id as keyof AppSettings['providers']];
            if (config.enabled) {
                verifyProvider(id, config);
            }
        });
    };

    useEffect(() => {
        if (!settings) return;
        ['ollama', 'gemini', 'openai'].forEach(id => {
            const config = settings.providers[id as keyof AppSettings['providers']];
            if (config.enabled && verification[id] === 'idle') {
                verifyProvider(id, config);
            }
        });
    }, [settings?.providers]);

    // Patch settings to ensure all providers exist
    useEffect(() => {
        if (!settings) return;
        let changed = false;
        const patchedProviders = { ...settings.providers };
        if (!patchedProviders.ollama) {
            patchedProviders.ollama = { enabled: true, url: 'http://localhost:11434' };
            changed = true;
        }
        if (!patchedProviders.gemini) {
            patchedProviders.gemini = { enabled: false, apiKey: '' };
            changed = true;
        }
        if (!patchedProviders.openai) {
            patchedProviders.openai = { enabled: false, apiKey: '' };
            changed = true;
        }
        if (changed) {
            setSettings({ ...settings, providers: patchedProviders });
        }
    }, [settings]);

    // Refresh models when the options page is closed (unmounted)
    useEffect(() => {
        return () => {
            refreshModels();
        };
    }, []);

    if (!settings) return <div class="p-8 text-slate-500 font-medium">Loading settings...</div>;

    if (!settings.prompts) {
        setSettings({
            ...settings,
            prompts: [
                {
                    id: 'default-summarize',
                    name: 'Summarize this page',
                    text: 'Summarize this page with less than 500 words',
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
                error = 'API Key is required for verification.';
            }
            if (id === 'ollama' && (!config.url || !/^https?:\/\/.+/.test(config.url))) {
                error = 'Valid URL is required.';
            }
        }
        setProviderErrors(prev => ({ ...prev, [id]: error }));
        return !error;
    }

    const updateProvider = (id: keyof AppSettings['providers'], updates: any) => {
        const newSettings = {
            ...settings,
            providers: {
                ...settings.providers,
                [id]: { ...settings.providers[id], ...updates }
            }
        };

        // Only validate when disabling or when updating API keys/URLs (not just enabling)
        const isEnablingOnly = updates.enabled === true && Object.keys(updates).length === 1;
        if (!isEnablingOnly && !validateProvider(id, newSettings.providers[id])) {
            return;
        }

        if (updates.enabled === false) {
            setVerification(prev => ({ ...prev, [id]: 'idle' }));
            setProviderErrors(prev => ({ ...prev, [id]: '' }));
            if (settings.selectedModelId?.startsWith(`${id}:`)) {
                newSettings.selectedModelId = '';
            }
        } else if (isEnablingOnly) {
            // Clear any existing errors when enabling
            setProviderErrors(prev => ({ ...prev, [id]: '' }));
        }

        setSettings(newSettings);

        // Only verify if the config is complete and enabled
        if (newSettings.providers[id].enabled) {
            verifyProvider(id, newSettings.providers[id]);
        }
    };

    const tabs = [
        { id: 'models', label: 'Providers', icon: Bot },
        { id: 'prompts', label: 'Prompts', icon: FileText },
        { id: 'about', label: 'About', icon: Info },
    ] as const;

    return (
        <div class="flex min-h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 gap-4">
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
                            <tab.icon class={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'text-indigo-600' : ''}`} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <main class="flex-1 bg-slate-100 dark:bg-slate-950">
                <div class="w-full max-w-5xl mx-auto">
                    {activeTab === 'models' && (
                        <div class="space-y-8">
                            <div class="w-full">
                                <table class="w-full border-separate border-spacing-y-4 border-spacing-x-2 -ml-2" style="table-layout: fixed;">
                                    <colgroup>
                                        <col style="width: 80px;" />
                                        <col style="width: 120px;" />
                                        <col style="width: auto;" />
                                        <col style="width: auto;" />
                                        <col style="width: 80px;" />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-center">Enable</th>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">Provider</th>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">API Key</th>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">URL</th>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {settings.providers && (['ollama', 'gemini', 'openai'] as const).map((id) => {
                                            const config = settings.providers[id];
                                            if (!config) return null;
                                            const isDisabled = !config.enabled;
                                            return (
                                                <tr key={id}>
                                                    <td class="text-center">
                                                        <div class="flex items-center justify-center h-10">
                                                            <input type="checkbox" checked={config.enabled} onChange={(e) => {
                                                                const isEnabled = (e.target as HTMLInputElement).checked;
                                                                if (!isEnabled) {
                                                                    updateProvider(id, { enabled: false, apiKey: '', url: '' });
                                                                } else {
                                                                    const enableUpdates: any = { enabled: true };
                                                                    if (id === 'ollama') {
                                                                        enableUpdates.url = 'http://localhost:11434';
                                                                    }
                                                                    updateProvider(id, enableUpdates);
                                                                }
                                                            }} class="w-5 h-5 rounded-lg text-indigo-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all cursor-pointer" />
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div class="flex items-center h-10 px-4">
                                                            <span class={`font-bold capitalize text-base ${isDisabled ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-slate-100'}`}>{id}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input type="password" value={config.apiKey || ''} disabled={isDisabled} onInput={(e) => updateProvider(id, { apiKey: (e.target as HTMLInputElement).value })} placeholder="API Key" class={`w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm transition-all ${isDisabled ? 'opacity-40 grayscale' : 'shadow-sm focus:ring-2 focus:ring-indigo-500/20'} ${id !== 'ollama' && !config.apiKey && !isDisabled ? 'border-amber-300' : 'border-slate-200 dark:border-slate-800'} ${providerErrors[id] ? 'border-red-500' : ''}`} />
                                                        {providerErrors[id] && id !== 'ollama' && (
                                                            <div class="text-xs text-red-500 mt-1">{providerErrors[id]}</div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {id === 'ollama' ? (
                                                            <div>
                                                                <input type="text" value={config.url || ''} disabled={isDisabled} onInput={(e) => updateProvider(id, { url: (e.target as HTMLInputElement).value })} class={`w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm transition-all ${isDisabled ? 'opacity-40 grayscale' : 'shadow-sm focus:ring-2 focus:ring-indigo-500/20'} border-slate-200 dark:border-slate-800 ${providerErrors[id] ? 'border-red-500' : ''}`} />
                                                                {providerErrors[id] && (
                                                                    <div class="text-xs text-red-500 mt-1">{providerErrors[id]}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div class="w-full h-10" />
                                                        )}
                                                    </td>
                                                    <td class="text-center">
                                                        {config.enabled && (
                                                            <div class="flex items-center justify-center h-10">
                                                                {verification[id] === 'loading' && <Loader2 class="w-5 h-5 text-slate-400 animate-spin" />}
                                                                {verification[id] === 'success' && <CheckCircle2 class="w-5 h-5 text-green-500" />}
                                                                {verification[id] === 'error' && <XCircle class="w-5 h-5 text-red-500" />}
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
                                <table class="w-full border-separate border-spacing-y-4 border-spacing-x-2 -ml-2" style="table-layout: fixed;">
                                    <colgroup>
                                        <col style="width: 200px;" />
                                        <col style="width: auto;" />
                                        <col style="width: 60px;" />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">Name</th>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">Prompt Text</th>
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
                                                                p.id === prompt.id ? { ...p, name: (e.target as HTMLInputElement).value } : p
                                                            );
                                                            debouncedSavePrompts(newPrompts);
                                                        }}
                                                        class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm transition-all shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                </td>
                                                <td class="align-top">
                                                    <textarea
                                                        value={prompt.text}
                                                        maxLength={1000}
                                                        onInput={(e) => {
                                                            const newPrompts = localPrompts.map(p =>
                                                                p.id === prompt.id ? { ...p, text: (e.target as HTMLTextAreaElement).value } : p
                                                            );
                                                            debouncedSavePrompts(newPrompts);
                                                        }}
                                                        rows={3}
                                                        class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm transition-all shadow-sm focus:ring-2 focus:ring-indigo-500/20 resize-y min-h-[80px]"
                                                    />
                                                </td>
                                                <td class="text-center align-top">
                                                    <div class="flex items-start justify-center pt-2.5">
                                                        <button
                                                            onClick={() => {
                                                                if (!prompt.isDefault) {
                                                                    const newPrompts = localPrompts.filter(p => p.id !== prompt.id);
                                                                    setLocalPrompts(newPrompts);
                                                                    if (settings) {
                                                                        setSettings({ ...settings, prompts: newPrompts });
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
                                                            <Trash2 class="w-5 h-5" />
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
                                            isDefault: false
                                        };
                                        const newPrompts = [...localPrompts, newPrompt];
                                        setLocalPrompts(newPrompts);
                                        if (settings) {
                                            setSettings({ ...settings, prompts: newPrompts });
                                        }
                                    }}
                                    class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                                >
                                    <Plus class="w-4 h-4" />
                                    <span>Add Prompt</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div class="space-y-6">
                            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-6 shadow-sm max-w-4xl">
                                <p class="text-lg font-medium leading-relaxed">
                                    LLM Companion - an Open Source Extension harnessing local and cloud LLM power in the browsers.
                                </p>

                                <div class="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Code</h3>
                                        <a href="https://github.com/" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">https://github.com/....</a>
                                    </div>

                                    <div>
                                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Bugs / Questions / Feature Requests</h3>
                                        <a href="https://github.com/" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">https://github.com/....</a>
                                    </div>

                                    <div>
                                        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Credits</h3>
                                        <p class="text-slate-600 dark:text-slate-300">TBD</p>
                                    </div>

                                    <div class="pt-4 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                        <p class="text-sm text-indigo-900 dark:text-indigo-200 font-medium">
                                            Donations are appreciated and encouraged further extension development: <span class="font-bold">TBD</span>
                                        </p>
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
