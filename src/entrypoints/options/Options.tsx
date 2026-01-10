import {useEffect, useState} from 'preact/hooks';
import {AppSettings, settingsStorage} from '@/lib/store';
import {useStorage} from '@/hooks/useStorage';
import {ProviderFactory} from '@/lib/providers/factory';
import {Model} from '@/lib/providers/types';
import {Bot, FileText, Info} from 'lucide-preact';
import '@/assets/main.css';

type TabId = 'models' | 'prompts' | 'about';

export default function Options() {
    const [settings, setSettings] = useStorage(settingsStorage);
    const [activeTab, setActiveTab] = useState<TabId>('models');
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [models, setModels] = useState<Record<string, Model[]>>({ ollama: [], gemini: [] });

    useEffect(() => {
        if (!settings) return;
        const refreshModels = async () => {
            const newModels: Record<string, Model[]> = { ollama: [], gemini: [] };
            for (const id of ['ollama', 'gemini'] as const) {
                if (settings.providers[id].enabled) {
                    try {
                        const provider = ProviderFactory.create(id, settings.providers[id]);
                        newModels[id] = await provider.getModels();
                    } catch (e) { console.error(e); }
                }
            }
            setModels(newModels);
        };
        refreshModels();
    }, [settings?.providers.ollama.enabled, settings?.providers.gemini.enabled]);

    const handleSave = async () => {
        setStatus('saving');
        setTimeout(() => {
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        }, 500);
    };

    if (!settings) return <div class="p-8 text-slate-500 font-medium">Loading settings...</div>;

    const updateProvider = (id: keyof AppSettings['providers'], updates: any) => {
        setSettings({
            ...settings,
            providers: {
                ...settings.providers,
                [id]: { ...settings.providers[id], ...updates }
            }
        });
    };

    const tabs = [
        { id: 'models', label: 'Providers', icon: Bot },
        { id: 'prompts', label: 'Prompts', icon: FileText },
        { id: 'about', label: 'About', icon: Info },
    ] as const;

    return (
        <div class="flex min-h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 gap-4">
            {/* Sidebar */}
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

            {/* Main Content */}
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
                                        <col style="width: 100px;" />
                                        <col style="width: 150px;" />
                                        <col style="width: 45%;" />
                                        <col style="width: 45%;" />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-center">Enable</th>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">Provider</th>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">API Key</th>
                                            <th class="px-4 py-2 text-[11px] font-bold text-slate-400 tracking-wider text-left">URL</th>
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
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'prompts' && <div class="text-center py-20 text-slate-400 font-medium">Prompts management coming soon</div>}
                    {activeTab === 'about' && <div class="text-center py-20 text-slate-400 font-medium">LLM Companion v0.0.1</div>}
                </div>
            </main>
        </div>
    );
}
