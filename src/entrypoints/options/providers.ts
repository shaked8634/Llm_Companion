import './style.css';
import {OpenaiProvider} from "@/components/providers/openai";
import {GeminiProvider} from "@/components/providers/gemini";
import {OllamaProvider} from "@/components/providers/ollama";
import {toggleFieldAtt} from "@/common/entrypoints";
import {AiProvider, ProviderType} from "@/components/providers/provider";

import {updateModels, updateModelsState} from "@/components/models";

const providersHtmlTmpl = async (
    openai: AiProvider,
    gemini: AiProvider,
    ollama: AiProvider,
) => `
  <div class="section-container">
    <table class="sections-table">
      <tbody>
        <tr>
          <td><input type="checkbox" class="provider-checkbox" id=${openai.name} ${openai.enabled ? 'checked' : ''}></td>
          <td>OpenAI</td>
          <td><input type="text" class="apiKey" placeholder="API key (optional)" value="${openai.key}" ${openai.enabled ? '' : 'disabled'}></td>
          <td></td>
          <td>${openai.enabled ? (await openai.isConnected() ? '<span class="status connected">V</span>' : '<span class="status disconnected">X</span>') : ''}</td>
        </tr>
        <tr>
          <td><input type="checkbox" class="provider-checkbox" id=${gemini.name} ${gemini.enabled ? 'checked' : ''}></td>
          <td>Google Gemini</td>
          <td><input type="text" class="apiKey" placeholder="API key (optional)" value="${gemini.key}" ${gemini.enabled ? '' : 'disabled'}></td>
          <td></td>
          <td>${gemini.enabled ? (await gemini.isConnected() ? '<span class="status connected">V</span>' : '<span class="status disconnected">X</span>') : ''}</td>
        </tr>
        <tr>
          <td><input type="checkbox" class="provider-checkbox" id=${ollama.name} ${ollama.enabled ? 'checked' : ''}></td>
          <td>Ollama</td>
          <td><input type="text" class="apiKey" placeholder="API key (optional)" value="${ollama.key}" ${ollama.enabled ? '' : 'disabled'}></td>
          <td><input type="text" class="url" placeholder="URL" value="${ollama.url}" required ${ollama.enabled ? '' : 'disabled'}></td>
          <td>${ollama.enabled ? (await ollama.isConnected() ? '<span class="status connected">V</span>' : '<span class="status disconnected">X</span>') : ''}</td>
        </tr>
      </tbody>
    </table>
    <div class="refresh-button-container">
      <button id="refresh-models-button">Refresh models</button>
    </div>
  </div>
`;

export const handleProviders = async (mainContent: HTMLElement): Promise<void> => {
    const openaiData = await storage.getItem<Partial<OpenaiProvider>>(`local:${ProviderType.Openai}`);
    const openai: OpenaiProvider = openaiData ? OpenaiProvider.hydrate(openaiData) : new OpenaiProvider();

    const geminiData = await storage.getItem<Partial<GeminiProvider>>(`local:${ProviderType.Gemini}`);
    const gemini: GeminiProvider = geminiData ? GeminiProvider.hydrate(geminiData) : new GeminiProvider();

    const ollamaData = await storage.getItem<Partial<OllamaProvider>>(`local:${[ProviderType.Ollama]}`);
    const ollama: OllamaProvider = ollamaData ? OllamaProvider.hydrate(ollamaData) : new OllamaProvider();

    // Nested function def to render table after events
    const renderTable = async () => {
        mainContent.innerHTML = await providersHtmlTmpl(openai, gemini, ollama);
    };
    await renderTable();

    const providerMappings = {Openai: openai, Gemini: gemini, Ollama: ollama};
    Object.keys(providerMappings).forEach((providerName) => {
        const aiProvider: AiProvider = providerMappings[providerName as keyof typeof providerMappings];

        const checkbox = mainContent.querySelector<HTMLInputElement>(`#${providerName}`)!;

        const row = checkbox.closest('tr')!;
        const keyInput = row.querySelector<HTMLInputElement>('.apiKey')!;
        const urlInput = row.querySelector<HTMLInputElement>('.url')!;

        checkbox.addEventListener('change', async (event) => {
            const isChecked = (event.target as HTMLInputElement).checked;
            aiProvider.enabled = isChecked;

            // Enable/disable key and url fields if checkbox is checked
            toggleFieldAtt(keyInput, isChecked);
            if (urlInput) {
                toggleFieldAtt(urlInput, isChecked);
            }

            if (isChecked) {
                await updateModelsState(providerName, true)
            } else {
                // Reset key and url if checkbox is unchecked
                keyInput.value = '';
                aiProvider.key = '';
                await updateModelsState(providerName, false)
                // Restore default URL for Ollama
                if (providerName === OllamaProvider.name) {
                    urlInput.value = OllamaProvider.defaultUrl;
                    aiProvider.url = OllamaProvider.defaultUrl;
                }
            }
            await storage.setItem(`local:${providerName}`, JSON.stringify(aiProvider));
            await renderTable();
        });

        keyInput.addEventListener('input', async () => {
            aiProvider.key = keyInput.value;
            await storage.setItem(`local:${providerName}`, aiProvider);
            await renderTable();
        });

        if (urlInput) {
            urlInput.addEventListener('input', async () => {
                aiProvider.url = urlInput.value;
                await storage.setItem(`local:${providerName}`, aiProvider);
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

                await updateModels(Object.values(providerMappings));
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