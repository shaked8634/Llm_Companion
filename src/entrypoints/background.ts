import {loadProvider} from "@/components/providers/provider";
import {setItem} from "@/common/storage";
import {ActionResponse} from "@/common/types";
import {extensionVersion} from "@/common/constants";

export default defineBackground(() => {
    chrome.action.onClicked.addListener((tab) => {
        chrome.runtime.openOptionsPage();
    });
});

chrome.runtime.onStartup.addListener(async () => {
    await setItem('version', extensionVersion)
    await setItem('lastOutput', '')
    console.debug("Clean last output")
});


chrome.runtime.onInstalled.addListener(async (details) => {
    await setItem('lastOutput', '')
    // if (details.reason === 'install') {
    //     console.log('Extension installed for the first time.');
    //
    // } else if (details.reason === 'update') {
    //     console.log('Extension updated.');
    //     // Optional: Handle actions for an update
    // }
});

// Background jobs
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse): Promise<ActionResponse> => {
    if (request.action === 'executePrompt') {
        const { model, prompt } = request;

        await executePrompt(model, prompt)
            .then((output) => {
                sendResponse({ success: true, output });
                return { success: true, output: output };
            })
            .catch((error) => {
                sendResponse({ success: false, error: error.message });
                return { success: false, error: error.message };
            });
    }  else {
        console.warn("Received unknown message:", request.action);
        return {output: null, success: false, error: `Unknown message: ${request.action}`};
    }
    return {output: null, success: false, error: `Unknown error: ${request}` };
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