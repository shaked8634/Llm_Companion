import {getProviderMappings, loadProvider} from "@/components/providers/provider";
import {setItem, StorageKeys} from "@/common/storage";
import {extensionVersion} from "@/common/constants";
import {Prompt, SummarizePrompt} from "@/components/prompts";

export default defineBackground(() => {
    chrome.action.onClicked.addListener((tab) => {
        chrome.runtime.openOptionsPage();
    });
});

chrome.runtime.onStartup.addListener(async () => {
    await setItem(StorageKeys.LastOutput, '');
    console.debug("Clean last output");
});


chrome.runtime.onInstalled.addListener(async (details) => {
    console.debug("Creating storage objects")
    await setItem(StorageKeys.Version, extensionVersion);
    await setItem(StorageKeys.PromptMappings, JSON.stringify({[SummarizePrompt.Name]: new Prompt(true, SummarizePrompt.Prompt)}));

    const providerMappings = getProviderMappings();
    console.debug('providers:\n', providerMappings)
    await setItem(StorageKeys.ProviderMappings, JSON.stringify(providerMappings));

});

chrome.runtime.onUpdateAvailable.addListener(async (details) => {
    console.debug("Updating storage objects")
    await setItem(StorageKeys.Version, extensionVersion);
    // TODO UPDATE prompts
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
        await setItem(StorageKeys.LastOutput, output);
        console.debug("Sending output to popup\n:", output);
        await chrome.runtime.sendMessage({ action: 'updateOutput', output});
        return output;
    } catch (error) {
        console.error("Error executing prompt:", error);
        return { success: false, error: (error as Error).message};
    }
}