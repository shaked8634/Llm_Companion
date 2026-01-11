import {useEffect, useState} from 'preact/hooks';
import {AppSettings, settingsStorage} from '@/lib/store';
import {useStorage} from '@/hooks/useStorage';
import {ProviderFactory} from '@/lib/providers/factory';
import {Bot, CheckCircle2, FileText, Info, Loader2, RotateCw, XCircle} from 'lucide-preact';
import '@/assets/main.css';

type TabId = 'models' | 'prompts' | 'about';
type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Options() {
    const [settings, setSettings] = useStorage(settingsStorage);
    const [activeTab, setActiveTab] = useState<TabId>('models');
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [verification, setVerification] = useState<Record<string, VerificationStatus>>({
        ollama: 'idle',
        gemini: 'idle'
    });

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
        ['ollama', 'gemini'].forEach(id => {
            const config = settings.providers[id as keyof AppSettings['providers']];
            if (config.enabled) {
                verifyProvider(id, config);
            }
        });
    };

    // Run verification when settings change
    useEffect(() => {
        if (!settings) return;
        ['ollama', 'gemini'].forEach(id => {
            const config = settings.providers[id as keyof AppSettings['providers']];
            if (config.enabled && verification[id] === 'idle') {
                verifyProvider(id, config);
            }
        });
    }, [settings?.providers]);

    const handleSave = async () => {
        setStatus('saving');
        setTimeout(() => {
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        }, 500);
    };

    if (!settings) return <div class="p-8 text-slate-500 font-medium">Loading settings...</div>;

    const updateProvider = (id: keyof AppSettings['providers'], updates: any) => {
        const newSettings = {
            ...settings,
            providers: {
                ...settings.providers,
                [id]: { ...settings.providers[id], ...updates }
            }
        };

        // If disabling, clear verification state
        if (updates.enabled === false) {
            setVerification(prev => ({ ...prev, [id]: 'idle' }));
            // Also reset selected model if it belongs to this provider
            if (settings.selectedModelId?.startsWith(`${id}:`)) {
                newSettings.selectedModelId = '';
            }
        } else if (updates.enabled === true || updates.apiKey !== undefined || updates.url !== undefined) {
            // Trigger verification on change
            verifyProvider(id, newSettings.providers[id]);
        }

        setSettings(newSettings);
    };

    const tabs = [
        { id: 'models', label: 'Providers', icon: Bot },
        { id: 'prompts', label: 'Prompts', icon: FileText },
        { id: 'about', label: 'About', icon: Info },
    ] as const;

    return (
        <div class="flex min-h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 gap-4">
            <aside class="w-64 flex flex-col shrink-0">
                <nav class="flex-1 flex flex-col gap-4">
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
                <div class="mt-auto pt-6">
                    <button onClick={handleSave} class={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold ${status === 'saved' ? 'bg-green-600' : 'bg-indigo-600'} text-white shadow-lg transition-all hover:opacity-90 active:scale-95`}>
                        {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save changes'}
                    </button>
                </div>
            </aside>

            <main class="flex-1 bg-slate-100 dark:bg-slate-950">
                <div class="w-full">
                    {activeTab === 'models' && (
                        <div class="space-y-8">
                            <div>
                                <h1 class="text-3xl font-bold tracking-tight">Providers</h1>
                                <p class="text-slate-500 dark:text-slate-400 mt-2 text-sm">Configure your LLM providers and API connections.</p>
                            </div>
                            
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
                                        {(['ollama', 'gemini'] as const).map((id) => {
                                            const config = settings.providers[id];
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
                                                                    updateProvider(id, { enabled: true });
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
                                                        <input type="password" value={config.apiKey || ''} disabled={isDisabled} onInput={(e) => updateProvider(id, { apiKey: (e.target as HTMLInputElement).value })} placeholder="API Key" class={`w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm transition-all ${isDisabled ? 'opacity-40 grayscale' : 'shadow-sm focus:ring-2 focus:ring-indigo-500/20'} ${id !== 'ollama' && !config.apiKey && !isDisabled ? 'border-amber-300' : 'border-slate-200 dark:border-slate-800'}`} />
                                                    </td>
                                                    <td>
                                                        <input type="text" value={config.url || ''} disabled={isDisabled} onInput={(e) => updateProvider(id, { url: (e.target as HTMLInputElement).value })} class={`w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm transition-all ${isDisabled ? 'opacity-40 grayscale' : 'shadow-sm focus:ring-2 focus:ring-indigo-500/20'} border-slate-200 dark:border-slate-800`} />
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

                            <div class="mt-auto flex justify-end pb-4">
                                <button
                                    onClick={refreshModels}
                                    class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                                >
                                    <RotateCw class={`w-4 h-4 ${Object.values(verification).some(v => v === 'loading') ? 'animate-spin' : ''}`} />
                                    <span>Refresh Models</span>
                                </button>
                            </div>
                        </div>
                    )}
                    {activeTab === 'prompts' && <div class="text-center py-20 text-slate-400 font-medium">Prompts management coming soon</div>}
                    {activeTab === 'about' && (
                        <div class="max-w-2xl mx-auto py-10 space-y-8">
                            <div>
                                <h1 class="text-3xl font-bold tracking-tight">About</h1>
                                <p class="text-slate-500 dark:text-slate-400 mt-2 text-sm">Learn more about LLM Companion.</p>
                            </div>

                            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-6 shadow-sm">
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
