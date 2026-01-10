import {useState} from 'preact/hooks';
import {settingsStorage} from '@/lib/store';
import {useStorage} from '@/hooks/useStorage';
import {Bot, Check, FileText, Info, Save} from 'lucide-preact';
import '@/assets/main.css';

type TabId = 'models' | 'prompts' | 'about';

export default function Options() {
    const [settings, setSettings] = useStorage(settingsStorage);
    const [activeTab, setActiveTab] = useState<TabId>('models');
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const handleSave = async () => {
        setStatus('saving');
        setTimeout(() => {
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        }, 500);
    };

    if (!settings) return <div class="p-8 text-slate-500 font-medium">Loading settings...</div>;

    const updateProvider = (id: string, updates: any) => {
        setSettings({
            ...settings,
            providers: {
                ...settings.providers,
                [id]: { ...settings.providers[id as keyof typeof settings.providers], ...updates }
            }
        });
    };

    const tabs = [
        { id: 'models', label: 'Models', icon: Bot },
        { id: 'prompts', label: 'Prompts', icon: FileText },
        { id: 'about', label: 'About', icon: Info },
    ] as const;

    return (
        <div class="flex h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Left Narrower Pane */}
            <aside class="w-64 bg-white border-r flex flex-col shadow-sm">
                <div class="p-6 border-b flex items-center gap-2 text-indigo-600">
                    <Bot class="w-6 h-6" />
                    <span class="font-bold text-lg tracking-tight">LLM Companion</span>
                </div>
                
                <nav class="flex-1 p-4 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            class={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-indigo-50 text-indigo-700' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            <tab.icon class="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div class="p-4 border-t">
                    <button 
                        onClick={handleSave}
                        class={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                            status === 'saved' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
                        }`}
                    >
                        {status === 'saving' ? 'Saving...' : status === 'saved' ? <><Check class="w-4 h-4" /> Saved</> : <><Save class="w-4 h-4" /> Save changes</>}
                    </button>
                </div>
            </aside>

            {/* Right Wider Pane */}
            <main class="flex-1 overflow-y-auto p-10">
                <div class="max-w-5xl mx-auto">
                    {activeTab === 'models' && (
                        <div class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <h1 class="text-2xl font-bold text-slate-900">AI Providers</h1>
                                <p class="text-slate-500 mt-1 text-sm">Enable and configure your LLM connections.</p>
                            </div>

                            <div class="bg-white rounded-2xl border shadow-sm overflow-hidden">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="bg-slate-50 border-b">
                                            <th class="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-20 text-center">Active</th>
                                            <th class="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-40">LLM Provider</th>
                                            <th class="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">API Key</th>
                                            <th class="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Endpoint URL</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        {(['ollama', 'gemini'] as const).map((id) => {
                                            const config = settings.providers[id];
                                            const isDisabled = !config.enabled;
                                            return (
                                                <tr key={id} class={`transition-all ${isDisabled ? 'grayscale opacity-60 bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
                                                    <td class="px-6 py-4 text-center">
                                                        <input 
                                                            type="checkbox"
                                                            checked={config.enabled}
                                                            onChange={(e) => updateProvider(id, { enabled: (e.target as HTMLInputElement).checked })}
                                                            class="w-4 h-4 rounded text-indigo-600 border-slate-300 transition-colors cursor-pointer"
                                                        />
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <span class={`font-semibold capitalize ${isDisabled ? 'text-slate-400' : 'text-slate-900'}`}>{id}</span>
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <input 
                                                            type="password"
                                                            value={config.apiKey || ''}
                                                            disabled={isDisabled}
                                                            onInput={(e) => updateProvider(id, { apiKey: (e.target as HTMLInputElement).value })}
                                                            placeholder={id !== 'ollama' ? 'Enter API Key...' : 'Not required'}
                                                            class="w-full px-3 py-1.5 bg-transparent border border-slate-200 rounded-lg text-sm"
                                                        />
                                                    </td>
                                                    <td class="px-6 py-4">
                                                        <input 
                                                            type="text"
                                                            value={config.url || ''}
                                                            disabled={isDisabled}
                                                            onInput={(e) => updateProvider(id, { url: (e.target as HTMLInputElement).value })}
                                                            placeholder="Endpoint URL..."
                                                            class="w-full px-3 py-1.5 bg-transparent border border-slate-200 rounded-lg text-sm"
                                                        />
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
