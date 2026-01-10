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
        <div class="flex min-h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
            <aside class="w-64 min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col shrink-0">
                <nav class="flex-1 p-4 flex flex-col gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold ${
                                activeTab === tab.id 
                                    ? 'bg-white dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700'
                            }`}
                        >
                            <tab.icon class="w-4 h-4 shrink-0" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
                <div class="p-4">
                    <button onClick={handleSave} class={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold ${status === 'saved' ? 'bg-green-600' : 'bg-indigo-600'} text-white shadow-lg`}>
                        {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save changes'}
                    </button>
                </div>
            </aside>

            <main class="flex-1 p-10 bg-slate-100 dark:bg-slate-950">
                <div class="w-full">
                    {activeTab === 'models' && (
                        <div class="space-y-6">
                            <div>
                                <h1 class="text-2xl font-bold">Providers</h1>
                                <p class="text-slate-500 dark:text-slate-400 mt-1 text-sm">Configure your LLM providers.</p>
                            </div>
                            <div class="overflow-hidden">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th class="px-6 py-4 text-[11px] font-bold text-slate-400 tracking-wider w-20 text-center">Enable</th>
                                            <th class="px-6 py-4 text-[11px] font-bold text-slate-400 tracking-wider w-32">Provider</th>
                                            <th class="px-6 py-4 text-[11px] font-bold text-slate-400 tracking-wider">API Key</th>
                                            <th class="px-6 py-4 text-[11px] font-bold text-slate-400 tracking-wider">URL</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y-0">
                                        {(['ollama', 'gemini'] as const).map((id) => {
                                            const config = settings.providers[id];
                                            const isDisabled = !config.enabled;
                                            return (
                                                <tr key={id} class={`${isDisabled ? 'grayscale opacity-60' : ''}`}>
                                                    <td class="px-6 py-4 text-center">
                                                        <input type="checkbox" checked={config.enabled} onChange={(e) => updateProvider(id, { enabled: (e.target as HTMLInputElement).checked })} class="w-4 h-4 rounded text-indigo-600 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <span class={`font-semibold capitalize ${isDisabled ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900'}`}>{id}</span>
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <input type="password" value={config.apiKey || ''} disabled={isDisabled} onInput={(e) => updateProvider(id, { apiKey: (e.target as HTMLInputElement).value })} placeholder="API Key" class={`w-full px-3 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-sm ${id !== 'ollama' && !config.apiKey && !isDisabled ? 'border-amber-300' : 'border-slate-300 dark:border-slate-700'}`} />
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <input type="text" value={config.url || ''} disabled={isDisabled} onInput={(e) => updateProvider(id, { url: (e.target as HTMLInputElement).value })} class="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm" />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'prompts' && <div class="text-center py-20 text-slate-400">Prompts coming soon</div>}
                    {activeTab === 'about' && <div class="text-center py-20 text-slate-400">About coming soon</div>}
                </div>
            </main>
        </div>
    );
}
