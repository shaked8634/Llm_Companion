import {getAllPrompts, SummarizePrompt} from "@/components/prompts";
import {getItem} from "@/common/storage";
import stopIcon from "@/assets/stop_icon.svg";
import playIcon from "@/assets/play_icon.svg";

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

    } catch (error) {
        console.error('Error fetching prompt options:', error);
        const dropdown = document.querySelector<HTMLSelectElement>('#prompts-dropdown');

        if (dropdown) {
            dropdown.innerHTML = '<option value="" disabled selected>Failed to load prompts</option>';
        }
    }
};

export async function handleExecutePrompt(this: HTMLButtonElement) {
    try {
        this.disabled = true;

        const icon = this.querySelector<HTMLImageElement>('img');
        if (icon) {
            icon.src = stopIcon;
            icon.classList.add('animate');
        }

        const currModel = document.querySelector<HTMLSelectElement>('#models-dropdown')!;
        const currPrompt = document.querySelector<HTMLSelectElement>('#prompts-dropdown')!;
        const outputContainer = document.querySelector<HTMLDivElement>('.output-container')!;

        // Disabling clear during prompt execution
        const clearButton = document.querySelector<HTMLButtonElement>('#clear-output')!;
        clearButton.disabled = true

        chrome.runtime.sendMessage(
            {
                action: 'executePrompt',
                model: currModel.value,
                prompt: currPrompt.value,
            },
            (response) => {
                if (response && response.success) {
                    outputContainer.textContent = response.output || '';
                    console.debug(`Generated output: ${response.output}`);
                } else {
                    console.error('Error executing prompt:', response.error);
                }
            }
        );
    } catch (error) {
        console.error('Error executing prompt:', error);
    }
}
