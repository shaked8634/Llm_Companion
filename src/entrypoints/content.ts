export default defineContentScript({
    matches: ['https://*/*'],
    async main(ctx): Promise<boolean> {
        console.debug('Hello content, ', ctx);
        // Listen for messages from the extension
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getPageHTML') {
                const html = document.documentElement.innerHTML;
                console.debug("HTML from tab\n:", html)
                sendResponse({html});
                return true;
            }
        });
        return false
    },
});
