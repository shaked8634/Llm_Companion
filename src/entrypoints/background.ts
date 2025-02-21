import {loadProvider} from "@/components/providers/provider";
import {setItem} from "@/common/storage";
import {ActionResponse} from "@/common/types";
import {extensionVersion} from "@/common/constants";
import {Prompt, SummarizePrompt} from "@/components/prompts";

export default defineBackground(() => {
    chrome.action.onClicked.addListener((tab) => {
        chrome.runtime.openOptionsPage();
    });
});

chrome.runtime.onStartup.addListener(async () => {
    await setItem('lastOutput', '');
    console.debug("Clean last output");
});


chrome.runtime.onInstalled.addListener(async (details) => {
    await setItem('version', extensionVersion);

    // Creating prompts object if doesn't exist
    const prompts = await getAllPrompts();
    console.debug("Adding prompts to storage")
    await setItem('prompts', JSON.stringify({[SummarizePrompt.Name]: new Prompt(true, SummarizePrompt.Prompt)}));
});

// Background jobs
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse): Promise<boolean> => {
    if (request.action === 'executePrompt') {
        const { model, prompt } = request;

        await executePrompt(model, prompt)
            .then((output) => {
                sendResponse({ success: true, output });
            })
            .catch((error) => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
    console.warn("Received unknown message:", request.action);
    return false;
});

async function executePrompt(providerModelName: string, prompt: string) {
    const splitModel = providerModelName.split(':')
    const providerName = splitModel[0]
    const modelName = splitModel.slice(1).join(':');
    try {
        const provider = await loadProvider(providerName)
        console.debug(`Executing prompt on '${providerModelName}'`);
        const output = await provider.stream(modelName, prompt)
        await setItem('lastOutput', output);
        console.debug("Sending output to popup\n:", output);
        await chrome.runtime.sendMessage({ action: 'updateOutput', output});
        return output;
    } catch (error) {
        console.error("Error executing prompt:", error);
        return { success: false, error: (error as Error).message};
    }
}