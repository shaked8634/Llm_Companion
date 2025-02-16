import {loadProvider} from "@/components/providers/provider";
import {setItem} from "@/common/storage";

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
});

// Background jobs
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse): Promise<boolean> => {
    if (request.action === 'executePrompt') {
        const { model, prompt } = request;

        await executePrompt(model, "Write 4 random words")
            .then((output) => {
                sendResponse({ success: true, output });
            })
            .catch((error) => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }  else {
        console.warn("Received unknown message:", request.action);
        return false;
    }

});

async function executePrompt(providerModelName: string, prompt: string) {
    const splitModel = providerModelName.split(':')
    const providerName = splitModel[0]
    const modelName = splitModel.slice(1).join(':');
    try {
        const provider = await loadProvider(providerName)
        console.debug(`Executing prompt: '${prompt}' on '${providerModelName}'`);
        const output = await provider.stream(modelName, prompt)
        await setItem('lastOutput', output);
        console.debug("Sending output to popup:", output);
        await chrome.runtime.sendMessage({ action: 'updateOutput', output});
        return output;
    } catch (error) {
        console.error("Error executing prompt:", error);
        return { success: false, error: (error as Error).message};
    }
}