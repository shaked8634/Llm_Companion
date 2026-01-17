import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {getTabSession, settingsStorage, TabSession} from '@/lib/store';
import {useStorage} from '@/hooks/useStorage';
import {ChevronDown, Cpu, Eraser, MessageSquareText, Play, RefreshCw, Settings, Sparkles} from 'lucide-preact';
import '@/assets/main.css';

interface PageContent {
    [key: string]: unknown;
}

export default function App() {
    const [currentTabId, setCurrentTabId] = useState<number | null>(null);
    const [settings, setSettings] = useStorage(settingsStorage);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) setCurrentTabId(tabs[0].id);
        });
    }, []);

    const sessionItem = useMemo(() => {
        return currentTabId ? getTabSession(currentTabId) : null;
    }, [currentTabId]);

    const [session] = useStorage<TabSession>(sessionItem);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages?.length]); // Only depend on length to prevent re-renders on content changes

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.debug('[Popup] Component unmounting, cleaning up');
        };
    }, []);

    const handleRefreshModels = async () => {
        setIsRefreshing(true);
        try {
            await chrome.runtime.sendMessage({ type: 'REFRESH_MODELS' });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleExecute = async () => {
        console.debug('[Popup] Execute button clicked');

        if (!currentTabId || !settings?.selectedModelId || !selectedPrompt) {
            console.warn('[Popup] Missing required data:', { currentTabId, selectedModelId: settings?.selectedModelId, selectedPrompt });
            return;
        }

        const prompt = settings.prompts?.find(p => p.id === selectedPrompt);
        if (!prompt) {
            console.error('[Popup] Prompt not found:', selectedPrompt);
            return;
        }

        console.debug('[Popup] Selected prompt:', { id: prompt.id, name: prompt.name, text: prompt.text });
        console.debug('[Popup] Requesting page scrape from tab:', currentTabId);

        let pageContent: PageContent | null = null;
        try {
            const response = await chrome.tabs.sendMessage(currentTabId, { type: 'SCRAPE_PAGE' });
            if (response?.success) {
                pageContent = response.payload as PageContent;
                console.debug('[Popup] Page content received:', {
                    title: pageContent?.title,
                    domain: pageContent?.domain,
                    wordCount: pageContent?.wordCount
                });
            } else {
                console.warn('[Popup] Scrape failed:', response?.error);
            }
        } catch (e) {
            console.error('[Popup] Failed to scrape page:', e);
        }

        console.debug('[Popup] Sending EXECUTE_PROMPT to background');
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
        console.log('[Popup] Clearing chat history');
        if (sessionItem) {
            sessionItem.setValue({ messages: [], isLoading: false });
        }
    };

    if (!session || !settings) return <div class="p-4 text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-900">Loading...</div>;

    const hasEnabledProviders = settings.providers.ollama.enabled || settings.providers.gemini.enabled;
    const prompts = settings.prompts || [];
    const models = settings.discoveredModels || [];

    // Auto-select first prompt if none selected
    if (!selectedPrompt && prompts.length > 0) {
        setSelectedPrompt(prompts[0].id);
    }

    return (
        <div class="flex flex-col w-[400px] min-w-[350px] max-w-[90vw] h-auto min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
            {/* Header */}
            <header class="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div class="flex items-center gap-2">
                    <Sparkles class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span class="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-tight">LLM Companion</span>
                </div>
                <div class="flex items-center gap-1">
                    <button
                        onClick={handleRefreshModels}
                        title="Refresh models"
                        disabled={isRefreshing}
                        class={`p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`}
                    >
                        <RefreshCw class="w-4 h-4" />
                        </button>
                    {session.messages.length > 0 && (
                        <button
                            onClick={clearHistory}
                            title="Clear conversation"
                            class="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all"
                        >
                            <Eraser class="w-4 h-4" />
                    </button>
                    )}
                    </div>
            </header>

            {/* Controls Grid */}
            <div class="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
                {/* Row 1: Models + Settings */}
                <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                        <Cpu class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <select
                            disabled={!hasEnabledProviders || models.length === 0}
                            value={settings.selectedModelId}
                            onChange={(e) => setSettings({ ...settings, selectedModelId: (e.target as HTMLSelectElement).value })}
                            class="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer disabled:opacity-50"
                    >
                            <option value="">{!hasEnabledProviders ? 'No providers' : models.length === 0 ? 'Loading models...' : 'Select model...'}</option>
                            {models.map(m => (
                                <option key={`${m.providerId}:${m.id}`} value={`${m.providerId}:${m.id}`}>
                                    {m.name} ({m.providerName})
                                </option>
                ))}
                        </select>
                                </div>
                    <button
                        onClick={() => chrome.runtime.openOptionsPage()}
                        title="Open settings"
                        class="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all shrink-0"
                    >
                        <Settings class="w-4 h-4" />
                    </button>
                </div>

                {/* Row 2: Prompts + Execute */}
                <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                        <MessageSquareText class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <select
                            value={selectedPrompt}
                            onChange={(e) => setSelectedPrompt((e.target as HTMLSelectElement).value)}
                            disabled={prompts.length === 0}
                            class="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs appearance-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50"
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
                        title="Execute prompt"
                        class="p-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all shrink-0"
                    >
                        <Play class="w-4 h-4 fill-current" />
                    </button>
                </div>
            </div>

            {/* Output Box: only expands when messages or loading */}
            {(session.messages.length > 0 || session.isLoading) && (
                <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 transition-all">
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
            )}
        </div>
    );
}
