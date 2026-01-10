import {handleExecutePrompt} from './chat-handler';

export default defineBackground(() => {
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
        if (message.type === 'EXECUTE_PROMPT') {
            const { userPrompt, pageContext, tabId } = message.payload;
            handleExecutePrompt(tabId, userPrompt, pageContext);
            return true; // Keep channel open
        }
    });
});
