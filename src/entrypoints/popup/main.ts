import './style.css';
import logo from '@/assets/logo.svg';
import optionsGear from '@/assets/options_gear.svg';
import {getAllModels} from "@/components/models";
import {aboutUrl} from "@/common/constants";
import {getAllPrompts, SummarizePrompt} from "@/components/prompts";
import playIcon from '@/assets/play_icon.svg';
import stopIcon from '@/assets/stop_icon.svg';
import {getItem, setItem} from "@/common/storage";
import {providerClassMap} from "@/components/providers/provider";

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
    <div class="prompt-wrapper">
      <select id="prompts-dropdown" class="dropdown">
        <option value="" disabled selected>Loading prompts...</option>
      </select>
      <button id="execute-prompt" class="execute-button">
        <img src="${playIcon}" alt="Execute" class="execute-icon" />
      </button>
    </div>
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
            const currModel = await getItem('currModel');

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

document.querySelector<HTMLButtonElement>('#open-options')!.addEventListener('click', async () => {
    chrome.runtime.openOptionsPage().catch((err) => {
        console.error('Failed to open options page:', err);
    });
});

document.querySelector<HTMLButtonElement>('#open-about')!.addEventListener('click', async () => {
    chrome.tabs.create({url: aboutUrl}).catch((err) => {
        console.error('Failed to open about page:', err);
    });
});

document.querySelector<HTMLSelectElement>('#models-dropdown')?.addEventListener('change', async (event) => {
    const selectedModel = (event.target as HTMLSelectElement).value;
    console.debug(`Model selected: ${selectedModel}`);

    setItem('currModel', selectedModel);
});

document.querySelector<HTMLSelectElement>('#prompts-dropdown')?.addEventListener('change', async (event) => {
    const selectedPrompt = (event.target as HTMLSelectElement).value;
    console.debug(`Prompt selected: ${selectedPrompt}`);

    setItem('currPrompt', selectedPrompt);
});

document.querySelector<HTMLButtonElement>('#execute-prompt')!.addEventListener('click', handleExecutePrompt);

async function handleExecutePrompt(this: HTMLButtonElement, event: Event) {
    try {
        this.disabled = true;

        const icon = this.querySelector<HTMLImageElement>('img');
        if (icon) {
            icon.src = stopIcon;
            icon.classList.add('animate');
        }

        const currModel = document.querySelector<HTMLSelectElement>('#models-dropdown');
        const currPrompt = document.querySelector<HTMLSelectElement>('#prompts-dropdown');
        if (currModel?.value && currPrompt?.value) {
            console.debug(`Executing prompt: '${currPrompt.value}' on model: '${currModel.value}'`)

            const output = await executePrompt(currModel.value, currPrompt.value);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.debug("No models available to execute prompt")
        }
    } catch (error) {
        console.error('Error executing prompt:', error);
    } finally {
        this.disabled = false;
        const icon = this.querySelector<HTMLImageElement>('img');
        if (icon) {
            icon.src = playIcon;
            icon.classList.remove('animate');
        }
    }
}

async function executePrompt(model: string, prompt: string) {
    const splitedModel = model.split(':', 2)
    const providerName = splitedModel[0]
    try {
        const providerData = await getItem(providerName);
        // console.log(`provider class def url: ${ProviderClass.defaultUrl}`);
        const ProviderClass = providerClassMap[providerName as keyof typeof providerClassMap];

        const providerInstance = new ProviderClass();
        
        const provider = providerInstance.populate(JSON.parse(providerData)); // Call hydrate on instance

        // const provider = ProviderClass.hydrate(JSON.parse(providerData));
        // const provider = ProviderClass.hydrate(JSON.parse(providerData));

        // await provider.stream()
    } catch (error) {
        console.error("Error executing prompt:", error)
    }
}