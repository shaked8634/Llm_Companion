import {getAllPrompts, SummarizePrompt} from "@/components/prompts";
import {getItem} from "@/common/storage";
import stopIcon from "@/assets/stop_icon.svg";
import {convertHtmlToMd} from "@/components/preprocessing";

export const populatePromptsDropdown = async () => {
    try {
        const dropdown = document.querySelector<HTMLSelectElement>('#prompts-dropdown')!;
        dropdown.innerHTML = '';       // Clear existing options

        const promptMappings = await getAllPrompts();
        console.debug(`Found ${Object.keys(promptMappings).length} prompts`)
        const currPrompt = await getItem('currPrompt') || SummarizePrompt.Name;

        Object.keys(promptMappings).forEach(promptName => {
            const prompt = promptMappings[promptName];

            if (prompt && (prompt.enabled || promptName == SummarizePrompt.Name)) {
                const option = document.createElement('option');
                option.value = option.textContent = promptName;

                if (promptName === currPrompt) {
                    option.defaultSelected = true
                }
                dropdown.appendChild(option);
            }
        });

        // Add "Other" option for free text input
        const otherOption = document.createElement('option');
        otherOption.value = 'Other';
        otherOption.textContent = 'Other (Enter custom prompt)';
        dropdown.appendChild(otherOption);

    } catch (error) {
        console.error('Error fetching prompt options:', error);
        const dropdown = document.querySelector<HTMLSelectElement>('#prompts-dropdown')!;
        dropdown.innerHTML = '<option value="" disabled selected>Failed to load prompts</option>';

    }
};

export async function handleExecutePrompt(this: HTMLButtonElement) {
    function generatePromptWithContext(prompt: string, context: string) {
        const fullPrompt = `# Instruction\n${prompt}\n# Context\n${context}`;
        console.debug("Full prompt:\n", fullPrompt)
        return fullPrompt;
    }

    try {
        this.disabled = true;

        const icon = this.querySelector<HTMLImageElement>('img')!;
        icon.src = stopIcon;
        icon.classList.add('animate');

        const currModel = document.querySelector<HTMLSelectElement>('#models-dropdown')!;
        const currPrompt = document.querySelector<HTMLSelectElement>('#prompts-dropdown')!;

        // Disabling clear during prompt execution
        const clearButton = document.querySelector<HTMLButtonElement>('#clear-output')!;
        clearButton.disabled = true;

        const promptsObj: { [key: string]: Prompt } = JSON.parse(await getItem('prompts'))

        let prompt = promptsObj[currPrompt.value].prompt;
        if (currPrompt.value == 'Other') {
            const customPrompt = document.querySelector<HTMLSelectElement>('#custom-prompt-input')!;
            prompt = customPrompt.value;
            console.debug("using custom prompt:", prompt)
        }

        // Send a message to the active tab's content script to get the page HTML
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab.id) {
            throw new Error("No active tab found.");
        }

        const response = await chrome.tabs.sendMessage(tab.id, {action: 'getPageHTML'}) as { html: string };

        const context: string = await convertHtmlToMd(response.html);
        const fullPrompt: string = generatePromptWithContext(prompt, context);

        await chrome.runtime.sendMessage(
            {
                action: 'executePrompt',
                model: currModel.value,
                prompt: fullPrompt,
            },
        );
    } catch (error) {
        console.error('Error executing prompt:', error);
    }
}