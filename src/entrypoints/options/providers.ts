import './style.css';
import {toggleFieldAtt} from "@/common/entrypoints";
import {AiProvider, BaseProvider} from "@/components/providers/base";

import {addModels, deleteModels, updateModels} from "@/components/models";
import {setItem} from "@/common/storage";
import {getProviders} from "@/components/providers/provider";
import {ProviderType} from "@/components/providers/types";
import {OllamaProvider} from "@/components/providers/ollama";

const providersHtmlTmpl = async (
    providerMapping: Record<ProviderType, AiProvider>) => `
  <div class="section-container">
    <table class="sections-table">
      <tbody>
        <tr>
          <td><input type="checkbox" class="provider-checkbox" id="${providerMapping[ProviderType.Openai].name}" ${providerMapping[ProviderType.Openai].enabled ? 'checked' : ''}></td>
          <td>OpenAI</td>
          <td><input type="text" class="apiKey" placeholder="API key (optional)" value="${providerMapping[ProviderType.Openai].key}" ${providerMapping[ProviderType.Openai].enabled ? '' : 'disabled'}></td>
          <td></td>
          <td>${providerMapping[ProviderType.Openai].enabled ? (await providerMapping[ProviderType.Openai].isConnected() ? '<span class="status connected">V</span>' : '<span class="status disconnected">X</span>') : ''}</td>
        </tr>
        <tr>
          <td><input type="checkbox" class="provider-checkbox" id="${providerMapping[ProviderType.Ollama].name}" ${providerMapping[ProviderType.Ollama].enabled ? 'checked' : ''}></td>
          <td>Ollama</td>
          <td><input type="text" class="apiKey" placeholder="API key (optional)" value="${providerMapping[ProviderType.Ollama].key}" ${providerMapping[ProviderType.Ollama].enabled ? '' : 'disabled'}></td>
          <td><input type="text" class="url" placeholder="URL" value="${providerMapping[ProviderType.Ollama].url}" required ${providerMapping[ProviderType.Ollama].enabled ? '' : 'disabled'}></td>
          <td>${providerMapping[ProviderType.Ollama].enabled ? (await providerMapping[ProviderType.Ollama].isConnected() ? '<span class="status connected">V</span>' : '<span class="status disconnected">X</span>') : ''}</td>
        </tr>
      </tbody>
    </table>
    <div class="refresh-button-container">
      <button id="refresh-models-button">Refresh models</button>
    </div>
  </div>
`;

export const handleProviders = async (mainContent: HTMLElement): Promise<void> => {
    // Loading Provider classes to present Options -> Provider view
    const providerMapping = await getProviders();

    // Nested function def to render table after events
    const renderTable = async () => {
        mainContent.innerHTML = await providersHtmlTmpl(providerMapping);
    };
    await renderTable();

    // Add event listener for each provider
    Object.keys(providerMapping).forEach((providerName) => {
        const baseProvider: BaseProvider = providerMapping[providerName as keyof typeof providerMapping];

        const checkbox = mainContent.querySelector<HTMLInputElement>(`#${providerName}`)!;

        const row = checkbox.closest('tr')!;
        const keyInput = row.querySelector<HTMLInputElement>('.apiKey')!;
        const urlInput = row.querySelector<HTMLInputElement>('.url')!;

        checkbox.addEventListener('change', async (event) => {
            const isChecked = (event.target as HTMLInputElement).checked;
            baseProvider.enabled = isChecked;

            // Enable/disable key and url fields if checkbox is checked
            toggleFieldAtt(keyInput, isChecked);
            if (urlInput) {
                toggleFieldAtt(urlInput, isChecked);
            }

            if (isChecked) {
                const providerModels = await baseProvider.getModels()
                await addModels(providerModels)
            } else {
                // Reset key and url if checkbox is unchecked
                keyInput.value = '';
                baseProvider.key = '';
                const providerModels = await baseProvider.getModels();
                await deleteModels(providerModels);
                // Restore default URL for Ollama
                if (providerName === ProviderType.Ollama) {
                    urlInput.value = baseProvider.url = OllamaProvider.defaultUrl;
                }
            }
            await setItem(providerName, baseProvider);
            await renderTable();
        });

        keyInput.addEventListener('input', async () => {
            baseProvider.key = keyInput.value;
            await setItem(providerName, baseProvider);
            await renderTable();
        });

        if (urlInput) {
            urlInput.addEventListener('input', async () => {
                baseProvider.url = urlInput.value;
                await setItem(providerName, baseProvider);
                await renderTable();
            });
        }
    });

// Event Delegation for "Refresh Models" Button
    mainContent.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement;
        if (target.id === 'refresh-models-button') {
            try {
                // Disable the button and show loading state
                const refreshButton = target as HTMLButtonElement;
                refreshButton.disabled = true;
                refreshButton.textContent = 'Refreshing...';

                await updateModels(Object.values(providerMapping));
                console.debug('Models refreshed');

                // Re-enable the button and reset text
                refreshButton.disabled = false;
                refreshButton.textContent = 'Refresh models';

                alert('Models have been refreshed successfully.');
            } catch (error) {
                console.error('Error refreshing models:', error);
                alert('Failed to refresh models. Please try again.');
            }
        }
    });
}