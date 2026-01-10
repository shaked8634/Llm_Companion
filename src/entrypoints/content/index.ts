import {extractPageContent} from '@/lib/utils/scraper';

export default defineContentScript({
    matches: ['<all_urls>'],
    main(_ctx) {
        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            if (message.type === 'SCRAPE_PAGE') {
                try {
                    const content = extractPageContent(document);
                    sendResponse({ success: true, payload: content });
                } catch (error: any) {
                    sendResponse({ success: false, error: error.message });
                }
                return true;
            }
        });
    },
});
