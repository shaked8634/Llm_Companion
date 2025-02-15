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
                setItem('lastOutput', output)
                sendResponse({ success: true, output });
            })
            .catch((error) => {
                sendResponse({ success: false, error: error.message });
            });
    }
    return true;
});

async function executePrompt(providerModelName: string, prompt: string) {
    const splitModel = providerModelName.split(':')
    const providerName = splitModel[0]
    const modelName = splitModel.slice(1).join(':');
    try {
        const provider = await loadProvider(providerName)
        console.debug(`Executing prompt: '${prompt}' on '${providerModelName}'`);
        return await provider.stream(modelName, prompt)
    } catch (error) {
        console.error("Error executing prompt:", error);
        return { success: false, error: (error as Error).message};
    }
}