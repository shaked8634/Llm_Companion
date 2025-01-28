export default defineBackground(() => {
    chrome.action.onClicked.addListener((tab) => {
        chrome.runtime.openOptionsPage();
    });
});


chrome.runtime.onInstalled.addListener(async (details) => {
    // if (details.reason === 'install') {
    //     console.log('Extension installed for the first time.');
    //
    // } else if (details.reason === 'update') {
    //     console.log('Extension updated.');
    //     // Optional: Handle actions for an update
    // }
    const isDarkModeEnabled = isDarkMode();
    console.log(`Dark mode is ${isDarkModeEnabled ? 'enabled' : 'disabled'}`);


});


function isDarkMode() {
    return window && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
