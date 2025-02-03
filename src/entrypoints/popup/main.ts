import './style.css';
import logo from '@/assets/logo.svg';
import optionsGear from '@/assets/options_gear.svg';
import {getAllModels} from "@/components/models";
import {aboutUrl} from "@/common/constants";

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
      <option value="" disabled selected>Loading options...</option>
    </select>
  </div>
     <div class="dropdown-container">
    <select id="prompt-dropdown" class="dropdown">
      <option value="" disabled selected>Loading options...</option>
    </select>
  </div>
`;

const updateMainContent = async () => {
   await populateModelsDropdown();
};

const populateModelsDropdown = async () => {
  try {
    const dropdown = document.querySelector<HTMLSelectElement>('#models-dropdown');

    if (dropdown) {
      dropdown.innerHTML = '';       // Clear existing options
      const models = await getAllModels();
      const savedModel = await storage.getItem<string>('local:currModel');

      console.log(`found ${models.length}`)
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = option.textContent = `${model.provider}:${model.name}`;
        dropdown.appendChild(option);

        if (savedModel == option.value) {
          option.selected = true;
        }

      });
    }
  } catch (error) {
    console.error('Error fetching model options:', error);
    const dropdown = document.querySelector<HTMLSelectElement>('#models-dropdown');

    if (dropdown) {
      dropdown.innerHTML = '<option value="" disabled selected>Failed to load options</option>';
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
    console.error('Failed to open options page:', err);
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