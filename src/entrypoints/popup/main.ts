import './style.css';
import logo from '@/assets/logo.svg';
import optionsGear from '@/assets/options_gear.svg';
import {getAllModels} from "@/components/models";
import {aboutUrl} from "@/common/constants";
import {SummarizePrompt, getAllPrompts} from "@/components/prompts";

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="header">
    <button id="open-about" class="options-button">
      <img src="${logo}" alt="Logo" class="logo-icon" />
    </button>
    <h2 class="headline">LLM Companion</h2>
    <button id="open-options" class="options-button">
      <img src="${optionsGear}" alt="Options" class="gear-icon" />
    </button>
  </div>
   <div class="dropdown-container">
    <select id="models-dropdown" class="dropdown">
      <option value="" disabled selected>Loading models...</option>
    </select>
  </div>
     <div class="dropdown-container">
    <select id="prompts-dropdown" class="dropdown">
      <option value="" disabled selected>Loading prompts...</option>
    </select>
  </div>
`;

const updateMainContent = async () => {
    await populateModelsDropdown();
    await populatePromptsDropdown();
};

const populateModelsDropdown = async () => {
    try {
        const dropdown = document.querySelector<HTMLSelectElement>('#models-dropdown');

        if (dropdown) {
            dropdown.innerHTML = '';       // Clear existing options
            const modelMappings = await getAllModels();
            console.debug(`Found ${Object.keys(modelMappings).length} models`)
            const currModel = await storage.getItem<string>('local:currModel');

            Object.keys(modelMappings).forEach(modelName => {
                const model = modelMappings[modelName];

                if (model && model.enabled) {
                    const option = document.createElement('option');
                    option.value = option.textContent = `${model.provider}:${model.name}`;
                    // Set saved model as selected
                    if (currModel == option.value) {
                        option.selected = true;
                    }
                    dropdown.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error fetching model options:', error);
        const dropdown = document.querySelector<HTMLSelectElement>('#models-dropdown');
;
        if (dropdown) {
            dropdown.innerHTML = '<option value="" disabled selected>Failed to load models</option>';
        }
    }
};

const populatePromptsDropdown = async () => {
    try {
        const dropdown = document.querySelector<HTMLSelectElement>('#prompts-dropdown');

        if (dropdown) {
            dropdown.innerHTML = '';       // Clear existing options

            const promptMappings = await getAllPrompts();
            console.debug(`Found ${Object.keys(promptMappings).length} prompts`)
            const currPrompt = await storage.getItem<string>('local:currPrompt') || SummarizePrompt.Name;

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
        }
    } catch (error) {
        console.error('Error fetching prompt options:', error);
        const dropdown = document.querySelector<HTMLSelectElement>('#prompts-dropdown');

        if (dropdown) {
            dropdown.innerHTML = '<option value="" disabled selected>Failed to load prompts</option>';
        }
    }
};

await updateMainContent()

document.querySelector<HTMLButtonElement>('#open-options')!.addEventListener('click', () => {
    chrome.runtime.openOptionsPage().catch((err) => {
        console.error('Failed to open options page:', err);
    });
});

document.querySelector<HTMLButtonElement>('#open-about')!.addEventListener('click', () => {
    chrome.tabs.create({url: aboutUrl}).catch((err) => {
        console.error('Failed to open about page:', err);
    });
});

document.querySelector<HTMLSelectElement>('#models-dropdown')?.addEventListener('change', (event) => {
    const selectedModel = (event.target as HTMLSelectElement).value;
    console.debug(`Model selected: ${selectedModel}`);

    storage.setItem<string>('local:currModel', selectedModel);
});

document.querySelector<HTMLSelectElement>('#prompts-dropdown')?.addEventListener('change', (event) => {
    const selectedPrompt = (event.target as HTMLSelectElement).value;
    console.debug(`Prompt selected: ${selectedPrompt}`);

    storage.setItem<string>('local:currPrompt', selectedPrompt);
});