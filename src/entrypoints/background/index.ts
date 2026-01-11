import {handleExecutePrompt} from './chat-handler';

export default defineBackground(() => {
    console.debug('[Background] Service worker initialized');

    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
        console.debug('[Background] Received message:', message.type);

        if (message.type === 'EXECUTE_PROMPT') {
            const { userPrompt, pageContext, tabId } = message.payload;
            console.debug('[Background] EXECUTE_PROMPT received for tab:', tabId);
            console.debug('[Background] User prompt:', userPrompt);
            console.debug('[Background] Has page context:', !!pageContext);

            handleExecutePrompt(tabId, userPrompt, pageContext);
            return true; // Keep channel open
        }
    });
});
