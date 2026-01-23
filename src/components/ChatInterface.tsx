import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {getTabSession, settingsStorage, TabSession} from '@/lib/store';
import {useStorage} from '@/hooks/useStorage';
import {
    ChevronDown,
    Cpu,
    Eraser,
    MessageSquareText,
    PanelRight,
    Play,
    RefreshCw,
    Settings,
    Square
} from 'lucide-preact';

interface PageContent {
    [key: string]: unknown;
}

interface ChatInterfaceProps {
    mode?: 'popup' | 'sidepanel';
}

export default function ChatInterface({ mode = 'popup' }: ChatInterfaceProps) {
    const [currentTabId, setCurrentTabId] = useState<number | null>(null);
    const [settings, setSettings] = useStorage(settingsStorage);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<string>('');
    const [followUpText, setFollowUpText] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Get initial active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                console.debug(`[${mode}] Initial tab:`, tabs[0].id);
                setCurrentTabId(tabs[0].id);
            }
        });

        // Listen for tab activation changes (when user switches tabs)
        const handleTabActivated = (activeInfo: { tabId: number; windowId: number }) => {
            console.debug(`[${mode}] Tab activated:`, activeInfo.tabId);
            setCurrentTabId(activeInfo.tabId);
        };

        // Listen for tab updates (when tab URL changes, etc.)
        const handleTabUpdated = (tabId: number, _changeInfo: { status?: string; url?: string }, _tab: chrome.tabs.Tab) => {
            // Only update if this is the current active tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id === tabId) {
                    console.debug(`[${mode}] Active tab updated:`, tabId);
                    setCurrentTabId(tabId);
                }
            });
        };

        chrome.tabs.onActivated.addListener(handleTabActivated);
        chrome.tabs.onUpdated.addListener(handleTabUpdated);

        // Cleanup listeners on unmount
        return () => {
            chrome.tabs.onActivated.removeListener(handleTabActivated);
            chrome.tabs.onUpdated.removeListener(handleTabUpdated);
        };
    }, [mode]);

    const sessionItem = useMemo(() => {
        return currentTabId ? getTabSession(currentTabId) : null;
    }, [currentTabId]);

    const [session] = useStorage<TabSession>(sessionItem);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages?.length]);

    useEffect(() => {
        return () => {
            console.debug(`[${mode}] Component unmounting, cleaning up`);
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
        console.debug(`[${mode}] Execute button clicked`);

        if (!currentTabId || !settings?.selectedModelId || !selectedPrompt) {
            console.warn(`[${mode}] Missing required data:`, { currentTabId, selectedModelId: settings?.selectedModelId, selectedPrompt });
            return;
        }

        const prompt = settings.prompts?.find(p => p.id === selectedPrompt);
        if (!prompt) {
            console.error(`[${mode}] Prompt not found:`, selectedPrompt);
            return;
        }

        console.debug(`[${mode}] Selected prompt:`, { id: prompt.id, name: prompt.name, text: prompt.text });
        console.debug(`[${mode}] Requesting page scrape from tab:`, currentTabId);

        let pageContent: PageContent | null = null;
        try {
            const response = await chrome.tabs.sendMessage(currentTabId, { type: 'SCRAPE_PAGE' });
            if (response?.success) {
                pageContent = response.payload as PageContent;
                console.debug(`[${mode}] Page content received:`, {
                    title: pageContent?.title,
                    domain: pageContent?.domain,
                    wordCount: pageContent?.wordCount
                });
            } else {
                console.warn(`[${mode}] Scrape failed:`, response?.error);
            }
        } catch (e) {
            console.error(`[${mode}] Failed to scrape page:`, e);
        }

        console.debug(`[${mode}] Sending EXECUTE_PROMPT to background`);
        chrome.runtime.sendMessage({
            type: 'EXECUTE_PROMPT',
            payload: {
                tabId: currentTabId,
                userPrompt: prompt.text,
                pageContext: pageContent ? JSON.stringify(pageContent) : ''
            }
        });
    };

    const handleFollowUp = async () => {
        console.debug(`[${mode}] Follow-up button clicked`);

        if (!currentTabId || !settings?.selectedModelId || !followUpText.trim()) {
            console.warn(`[${mode}] Missing required data for follow-up:`, {
                currentTabId,
                selectedModelId: settings?.selectedModelId,
                followUpText: followUpText.trim()
            });
            return;
        }

        console.debug(`[${mode}] Sending follow-up message:`, followUpText);

        chrome.runtime.sendMessage({
            type: 'EXECUTE_PROMPT',
            payload: {
                tabId: currentTabId,
                userPrompt: followUpText.trim(),
                pageContext: ''
            }
        });

        setFollowUpText('');
    };

    const handleFollowUpKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleFollowUp();
        }
    };

    const handleStop = () => {
        chrome.runtime.sendMessage({ type: 'STOP_EXECUTION', payload: { tabId: currentTabId } });
        if (sessionItem) sessionItem.setValue({
            ...session,
            isLoading: false,
            messages: session?.messages ?? []
        });
    };

    const clearHistory = () => {
        console.log(`[${mode}] Clearing chat history`);
        if (sessionItem) {
            sessionItem.setValue({ messages: [], isLoading: false });
        }
    };

    const openSidepanel = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await chrome.sidePanel.open({ tabId: tab.id });
            }
        } catch (error) {
            console.error('Error opening sidepanel:', error);
        }
    };

    if (!session || !settings) return <div class="p-4 text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-900">Loading...</div>;

    const hasEnabledProviders = settings.providers.ollama.enabled || settings.providers.gemini.enabled || settings.providers.openai.enabled;
    const prompts = settings.prompts || [];
    const models = settings.discoveredModels || [];

    useEffect(() => {
        if (!settings || !models.length) return;
        if (!settings.selectedModelId || !models.some(m => `${m.providerId}:${m.id}` === settings.selectedModelId)) {
            setSettings({
                ...settings,
                selectedModelId: `${models[0].providerId}:${models[0].id}`
            });
        }
    }, [models.length]);

    useEffect(() => {
        if (!settings || prompts.length === 0) return;

        if (settings.lastSelectedPromptId && prompts.some(p => p.id === settings.lastSelectedPromptId)) {
            setSelectedPrompt(settings.lastSelectedPromptId);
        } else if (!selectedPrompt) {
            setSelectedPrompt(prompts[0].id);
        }
    }, [settings?.lastSelectedPromptId, prompts.length]);

    const containerClass = mode === 'sidepanel'
        ? "flex flex-col w-full h-screen overflow-hidden bg-slate-100 dark:bg-slate-950"
        : "flex flex-col w-132.5 min-w-115 max-w-[95vw] h-auto min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950";

    return (
        <div class={containerClass}>
            {/* Header */}
            <header class="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center w-8 h-8">
                        <svg
                            class={`w-8 h-8 transition-colors duration-200 ${session.isLoading ? 'animate-spin' : ''} text-black dark:text-white`}
                            viewBox="0 0 76 76"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linejoin="round"
                                d="M 37,19C 38.1046,19 39,19.8954 39,21C 39,21.8215 38.2547,22.5274 37.5464,22.8352L 38.0834,28.0005C 41.9109,28.0452 44.9999,31.1619 44.9999,35L 45,38L 43.9999,38C 46.2091,38 47.9999,39.7909 47.9999,42L 47.9999,44C 47.9999,46.2091 46.2092,47.9999 44.0002,48L 45,48L 45,55.6003C 43.1755,56.4503 40.2712,57 37,57C 33.7288,57 30.8245,56.4503 29,55.6003L 29,48L 29.9997,48C 27.7907,47.9999 26,46.2091 26,44L 26,42C 26,39.7909 27.7908,38 30,38L 29,38L 29,35C 29,31.1619 32.089,28.0452 35.9166,28.0005L 36.4536,22.8352C 35.7453,22.5274 35,21.8215 35,21C 35,19.8954 35.8954,19 37,19 Z M 43.9999,39.0001L 29.9999,39.0001C 28.3431,39.0001 26.9999,40.3432 26.9999,42.0001L 26.9999,44.0001C 26.9999,45.6569 28.3431,47.0001 29.9999,47.0001L 43.9999,47.0001C 45.6567,47.0001 46.9999,45.6569 46.9999,44.0001L 46.9999,42.0001C 46.9999,40.3432 45.6567,39.0001 43.9999,39.0001 Z M 37,49.25L 36,49.0145L 36,51L 38,51L 38,49.0145L 37,49.25 Z M 43.9999,51C 44,49 43.2371,49.323 42,48.9954L 42,51L 43.9999,51 Z M 39,49.0609L 39,51L 41,51L 41,49.0331L 39,49.0609 Z M 33,49.0331L 33,51L 35,51L 35,49.0609L 33,49.0331 Z M 30,51L 32,51L 32,48.9954C 30.7628,49.323 30,49 30,51 Z M 37,54L 38,53.9772L 38,52L 36,52L 36,53.9772L 37,54 Z M 43.6475,52L 42,52L 42,53.1936C 42.7917,52.8545 43.3305,52.4373 43.6475,52 Z M 39,52L 39,53.9024C 39.7607,53.823 40.4253,53.6981 41,53.5394L 41,52L 39,52 Z M 33,52L 33,53.5L 32.8616,53.5C 33.4673,53.6776 34.1774,53.8165 35,53.9024L 35,52L 33,52 Z M 30.3523,52C 30.6694,52.4373 31.2082,52.8545 32,53.1936L 32,52L 30.3523,52 Z M 32,42L 34,42L 34,44L 32,44L 32,42 Z M 40,42L 42,42L 42,44L 40,44L 40,42 Z M 29.9999,40.0001L 31.1961,40.0001C 30.1797,40.6125 29.5,41.7269 29.5,43C 29.5,44.2732 30.1798,45.3876 31.1963,46.0001L 29.9999,46.0001C 28.8954,46.0001 27.9999,45.1046 27.9999,44.0001L 27.9999,42.0001C 27.9999,40.8955 28.8954,40.0001 29.9999,40.0001 Z M 43.9999,40.0001C 45.1044,40.0001 45.9999,40.8955 45.9999,42.0001L 45.9999,44.0001C 45.9999,45.1046 45.1044,46.0001 43.9999,46.0001L 42.8037,46.0001C 43.8202,45.3876 44.5,44.2732 44.5,43C 44.5,41.7269 43.8202,40.6125 42.8039,40.0001L 43.9999,40.0001 Z M 34.8037,46.0001C 35.8202,45.3876 36.5,44.2732 36.5,43C 36.5,41.7269 35.8202,40.6125 34.8039,40.0001L 39.1961,40.0001C 38.1797,40.6125 37.5,41.7269 37.5,43C 37.5,44.2732 38.1798,45.3876 39.1963,46.0001L 34.8037,46.0001 Z"
                            />
                        </svg>
                    </span>
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
                    {mode === 'popup' && (
                        <button
                            onClick={openSidepanel}
                            title="Open in sidebar"
                            class="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
                        >
                            <PanelRight class="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => chrome.runtime.openOptionsPage()}
                        title="Open settings"
                        class="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-all"
                    >
                        <Settings class="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Controls Grid */}
            <div class="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
                {/* Row 1: Models */}
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
                            {(() => {
                                const grouped = models.reduce((acc, model) => {
                                    if (!acc[model.providerName]) {
                                        acc[model.providerName] = [];
                                    }
                                    acc[model.providerName].push(model);
                                    return acc;
                                }, {} as Record<string, typeof models>);

                                return Object.entries(grouped)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([providerName, providerModels]) => (
                                        <optgroup key={providerName} label={providerName}>
                                            {providerModels
                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                .map(m => (
                                                    <option key={`${m.providerId}:${m.id}`} value={`${m.providerId}:${m.id}`}>
                                                        {m.name}
                                                    </option>
                                                ))
                                            }
                                        </optgroup>
                                    ));
                            })()}
                        </select>
                    </div>
                </div>

                {/* Row 2: Prompts + Execute */}
                <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                        <MessageSquareText class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <select
                            value={selectedPrompt}
                            onChange={(e) => {
                                const newPromptId = (e.target as HTMLSelectElement).value;
                                setSelectedPrompt(newPromptId);
                                if (settings) {
                                    setSettings({ ...settings, lastSelectedPromptId: newPromptId });
                                }
                            }}
                            disabled={prompts.length === 0}
                            class="w-full pl-8 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs appearance-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50 truncate"
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
                        onClick={session.isLoading ? handleStop : handleExecute}
                        disabled={!settings.selectedModelId || (!session.isLoading && !selectedPrompt)}
                        title={session.isLoading ? 'Stop' : 'Execute prompt'}
                        class={session.isLoading
                            ? 'p-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg transition-all shrink-0'
                            : 'p-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all shrink-0'}
                    >
                        {session.isLoading ? <Square class="w-4 h-4" /> : <Play class="w-4 h-4 fill-current" />}
                    </button>
                </div>
            </div>

            {/* Output Box */}
            {(session.messages.length > 0 || session.isLoading) && (
                <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 transition-all">
                    {session.messages.map((m, i) => (
                        <div key={i} class={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div class={`w-full px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm transition-colors ${
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
                            <div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl rounded-tl-none">
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

            {/* Follow-up Input */}
            {session.messages.length > 0 && (
                <div class="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <div class="flex items-end gap-2">
                        <textarea
                            value={followUpText}
                            onInput={(e) => setFollowUpText((e.target as HTMLTextAreaElement).value)}
                            onKeyPress={handleFollowUpKeyPress}
                            placeholder="Continue the conversation..."
                            disabled={session.isLoading}
                            class="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 min-h-[2.5rem] max-h-32"
                            rows={1}
                        />
                        <button
                            onClick={handleFollowUp}
                            disabled={!followUpText.trim() || session.isLoading}
                            title="Send follow-up message"
                            class="p-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all shrink-0"
                        >
                            <Play class="w-4 h-4 fill-current" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
