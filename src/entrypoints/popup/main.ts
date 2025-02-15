import './style.css';
import logo from '@/assets/logo.svg';
import optionsGear from '@/assets/options_gear.svg';
import {aboutUrl} from "@/common/constants";
import clearIcon from "@/assets/clear_icon.svg";
import playIcon from '@/assets/play_icon.svg';
import {setItem} from "@/common/storage";
import {handleExecutePrompt, populatePromptsDropdown} from "@/entrypoints/popup/handlePrompt";
import {populateOutputBox} from "@/entrypoints/popup/handleOutput";
import {populateModelsDropdown} from "@/entrypoints/popup/HandleModels";

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
      <button id="clear-output" class="execute-button">
        <img src="${clearIcon}" alt="Clear" class="execute-icon" />
      </button>
      <button id="execute-prompt" class="execute-button">
        <img src="${playIcon}" alt="Execute" class="execute-icon" />
      </button>
    </div>
    <div class="output-container"></div>
</div>
`;

const updateMainContent = async () => {
    await populateModelsDropdown();
    await populatePromptsDropdown();
    await populateOutputBox();
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

    await setItem('currModel', selectedModel);
});

document.querySelector<HTMLSelectElement>('#prompts-dropdown')?.addEventListener('change', async (event) => {
    const selectedPrompt = (event.target as HTMLSelectElement).value;
    console.debug(`Prompt selected: ${selectedPrompt}`);

    await setItem('currPrompt', selectedPrompt);
});

document.querySelector<HTMLSelectElement>('#clear-output')?.addEventListener('click', async () => {
    const outputContainer = document.querySelector<HTMLDivElement>('.output-container')!;
    outputContainer.textContent = ''
    await setItem('lastOutput', '')
    console.debug("Cleared output")
});

document.querySelector<HTMLButtonElement>('#execute-prompt')!.addEventListener('click', handleExecutePrompt);


// async function executePrompt(model: string, prompt: string) {
//     const splitedModel = model.split(':')
//     const providerName = splitedModel[0]
//     const modelName = splitedModel.slice(1).join(':');
//     try {
//         const provider = await loadProvider(providerName)
//         console.debug(`Executing prompt: '${prompt}' on '${model}'`);
//         return await provider.stream(modelName, prompt)
//     } catch (error) {
//         console.error("Error executing prompt:", error)
//     }
// }