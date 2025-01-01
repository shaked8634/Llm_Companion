export default defineBackground(() => {
    console.log('Hello background!', {id: browser.runtime.id});

    chrome.action.onClicked.addListener((tab) => {
        chrome.runtime.openOptionsPage();
    });
});

