import {extractPageContent} from '@/lib/utils/scraper';

export default defineContentScript({
    matches: ['<all_urls>'],
    main(_ctx) {
        console.debug('[Content Script] Initialized on:', window.location.href);

        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            if (message.type === 'SCRAPE_PAGE') {
                console.debug('[Content Script] Received SCRAPE_PAGE request');
                try {
                    const content = extractPageContent(document);
                    console.debug('[Content Script] Page content extracted, sending response');
                    sendResponse({ success: true, payload: content });
                } catch (error: any) {
                    console.error('[Content Script] Scraping failed:', error);
                    sendResponse({ success: false, error: error.message });
                }
                return true;
            }
        });
    },
});
