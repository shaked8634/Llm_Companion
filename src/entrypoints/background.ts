import {Prompt} from "../common/types";
import {defaultSummarizePrompt, extensionVersion} from "../common/constants";
import {OpenaiProvider} from "../components/providers/openai";
import {GeminiProvider} from "../components/providers/gemini";
import {OllamaProvider} from "../components/providers/ollama";
import {AiProvider} from "@/components/providers/provider";

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

    // let providers = new Map<string, AiProvider>([
    //     ['openai', new OpenaiProvider()],
    //     ['gemini', new GeminiProvider()],
    //     ['ollama', new OllamaProvider()],
    // ]);
    // storage.defineItem<Map<string, AiProvider>>('local:providers', {fallback: providers});
    //
    // let prompts = new Map<string, Prompt>([
    //     ['summarize', new Prompt(false, '', defaultSummarizePrompt)]
    // ]);
    // storage.defineItem<Map<string, Prompt>>('local:prompts', {fallback: prompts});

    // storage.defineItem<Prompt>('local:summarize', {fallback: new Prompt(false, '', defaultSummarizePrompt)});
    // storage.defineItem<string>('local:version', {fallback: extensionVersion});
});