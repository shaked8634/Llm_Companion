import {handleExecutePrompt} from './chat-handler';
import {refreshDiscoveredModels} from '@/lib/utils/discovery';
import {PromptType, settingsStorage} from '@/lib/store';

export default defineBackground(() => {
    console.debug('[Background] Service worker initialized');

    // Migrate old prompts to have type field
    settingsStorage.getValue().then(settings => {
        if (!settings || !settings.prompts) return;

        let needsUpdate = false;
        const updatedPrompts = settings.prompts.map(prompt => {
            if (!prompt.type) {
                needsUpdate = true;
                return {
                    ...prompt,
                    type: PromptType.WITH_WEBPAGE
                };
            }
            return prompt;
        });

        if (needsUpdate) {
            console.debug('[Background] Migrating prompts to include type field');
            settingsStorage.setValue({
                ...settings,
                prompts: updatedPrompts
            });
        }
    });

    // Initial discovery on startup
    refreshDiscoveredModels();

    // Re-discover when settings change (e.g. provider enabled/disabled or URL changed)
    settingsStorage.watch((newSettings, oldSettings) => {
        const providersChanged = JSON.stringify(newSettings?.providers) !== JSON.stringify(oldSettings?.providers);
        if (providersChanged) {
            console.debug('[Background] Settings changed, refreshing models...');
            refreshDiscoveredModels();
        }
    });

    // Handle keyboard shortcut command - opens popup and executes prompt
    chrome.commands.onCommand.addListener(async (command) => {
        console.debug('[Background] Command received:', command);

        if (command === 'execute-prompt') {
            try {
                // Open the popup first (must be done synchronously in response to user action)
                try {
                    await chrome.action.openPopup();
                    console.debug('[Background] Popup opened via keyboard shortcut');
                } catch (popupError) {
                    console.warn('[Background] Could not open popup:', popupError);
                    // Continue with execution even if popup fails to open
                }

                // Get the active tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) {
                    console.warn('[Background] No active tab found');
                    return;
                }

                console.debug('[Background] Executing prompt for tab:', tab.id);

                // Get current settings
                const settings = await settingsStorage.getValue();
                if (!settings.selectedModelId) {
                    console.warn('[Background] No model selected');
                    return;
                }

                // Get the last selected prompt or first prompt
                let promptId = settings.lastSelectedPromptId;
                if (!promptId || !settings.prompts?.find(p => p.id === promptId)) {
                    promptId = settings.prompts?.[0]?.id;
                }

                if (!promptId) {
                    console.warn('[Background] No prompts available');
                    return;
                }

                const prompt = settings.prompts.find(p => p.id === promptId);
                if (!prompt) {
                    console.error('[Background] Prompt not found:', promptId);
                    return;
                }

                console.debug('[Background] Using prompt:', prompt.name);

                // Scrape the page
                let pageContent = null;
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' });
                    if (response?.success) {
                        pageContent = response.payload;
                        console.debug('[Background] Page scraped successfully');
                    }
                } catch (e) {
                    console.warn('[Background] Failed to scrape page:', e);
                }

                // Execute the prompt
                await handleExecutePrompt(
                    tab.id,
                    prompt.text,
                    pageContent ? JSON.stringify(pageContent) : ''
                );

                console.debug('[Background] Keyboard shortcut execution completed');
            } catch (error) {
                console.error('[Background] Error executing keyboard shortcut:', error);
            }
        }

        if (command === 'open-sidepanel') {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    await chrome.sidePanel.open({ tabId: tab.id });
                    console.debug('[Background] Sidepanel opened via keyboard shortcut');
                }
            } catch (error) {
                console.error('[Background] Error opening sidepanel:', error);
            }
        }
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        console.debug('[Background] Received message:', message.type);

        if (message.type === 'EXECUTE_PROMPT') {
            const { userPrompt, pageContext, tabId } = message.payload;
            console.debug('[Background] EXECUTE_PROMPT received for tab:', tabId);
            console.debug('[Background] User prompt:', userPrompt);
            console.debug('[Background] Has page context:', !!pageContext);

            // Handle async execution and send response
            handleExecutePrompt(tabId, userPrompt, pageContext)
                .then(() => {
                    console.debug('[Background] Execute prompt completed successfully');
                    try {
                        sendResponse({ success: true });
                    } catch (e) {
                        console.warn('[Background] Could not send success response:', e);
                    }
                })
                .catch((error) => {
                    console.error('[Background] Execute prompt failed:', error);
                    try {
                        sendResponse({ success: false, error: error.message });
                    } catch (e) {
                        console.warn('[Background] Could not send error response:', e);
                    }
                });

            return true; // Keep channel open for async response
        }

        if (message.type === 'REFRESH_MODELS') {
            refreshDiscoveredModels()
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }

        // Send response for unhandled message types
        try {
            sendResponse({ success: false, error: 'Unknown message type' });
        } catch (e) {
            console.warn('[Background] Could not send response for unknown message:', e);
        }
        return false;
    });
});
