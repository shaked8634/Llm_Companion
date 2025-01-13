export default defineBackground(() => {
    console.log('Hello background!', {id: browser.runtime.id});

    chrome.action.onClicked.addListener((tab) => {
        chrome.runtime.openOptionsPage();
    });
});


// chrome.runtime.onInstalled.addListener((details) => {
//     if (details.reason === 'install') {
//         console.log('Extension installed for the first time.');
//
//         chrome.storage.sync.set({ initialized: true }, () => {
//             console.log('Initial settings saved.');
//         });
//     }
//
//     if (details.reason === 'update') {
//         console.log('Extension updated.');
//         // Optional: Handle actions for an update
//     }
// });