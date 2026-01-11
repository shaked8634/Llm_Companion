import {handleExecutePrompt} from './chat-handler';
import {refreshDiscoveredModels} from '@/lib/utils/discovery';
import {settingsStorage} from '@/lib/store';

export default defineBackground(() => {
    console.debug('[Background] Service worker initialized');

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
