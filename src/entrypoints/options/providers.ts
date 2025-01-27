import './style.css';
import {OpenaiProvider} from "@/components/providers/openai";
import {GeminiProvider} from "@/components/providers/gemini";
import {OllamaProvider} from "@/components/providers/ollama";
import {toggleFieldAtt} from "@/common/entrypoints";
import {AiProvider} from "@/components/providers/provider";

export const providersHtmlTmpl = async (
    openai: AiProvider,
    gemini: AiProvider,
    ollama: AiProvider,
) => `
  <table>
    <tbody>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="openai" ${openai.enabled ? 'checked' : ''}></td>
        <td>OpenAI</td>
        <td><input type="text" placeholder="API key (optional)" value="${openai.key}" ${openai.enabled ? '' : 'disabled'}></td>
        <td/>
        <td>${openai.enabled ? (await openai.isConnected() ? '<span style="color: green;">V</span>' : '<span style="color: red;">X</span>') : ''}</td>
      </tr>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="gemini" ${gemini.enabled ? 'checked' : ''}></td>
        <td>Google Gemini</td>
        <td><input type="text" placeholder="API key (optional)" value="${gemini.key}" ${gemini.enabled ? '' : 'disabled'}></td>
        <td/>
        <td>${gemini.enabled ? (await gemini.isConnected() ? '<span style="color: green;">V</span>' : '<span style="color: red;">X</span>') : ''}</td>
      </tr>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="ollama" ${ollama.enabled ? 'checked' : ''}></td>
        <td>Ollama</td>
        <td><input type="text" placeholder="API key (optional)" value="${ollama.key}" ${ollama.enabled ? '' : 'disabled'}></td>
        <td><input type="text" placeholder="URL (optional)" value="${ollama.url}" ${ollama.enabled ? '' : 'disabled'}></td>
        <td>${ollama.enabled ? (await ollama.isConnected() ? '<span style="color: green;">V</span>' : '<span style="color: red;">X</span>') : ''}</td>
      </tr>
    </tbody>
  </table>
`;

export const handleProviders = async (mainContent: HTMLElement): Promise<void> => {
    const openaiData = await storage.getItem<Partial<OpenaiProvider>>('local:openai');
    const openai: OpenaiProvider = openaiData ? OpenaiProvider.hydrate(openaiData) : new OpenaiProvider();

    const geminiData = await storage.getItem<Partial<GeminiProvider>>('local:gemini');
    const gemini: GeminiProvider = geminiData ? GeminiProvider.hydrate(geminiData) : new GeminiProvider();


    const ollamaData = await storage.getItem<Partial<OllamaProvider>>('local:ollama');
    const ollama: OllamaProvider = ollamaData ? OllamaProvider.hydrate(ollamaData) : new OllamaProvider();

    // Nested function def
    const renderTable = async () => {
        mainContent.innerHTML = await providersHtmlTmpl(openai, gemini, ollama);
    };
    await renderTable();
    // mainContent.innerHTML = await providersHtmlTmpl(openai, gemini, ollama);

    const providers = {openai, gemini, ollama};


    Object.keys(providers).forEach((providerName) => {
        const aiProvider = providers[providerName as keyof typeof providers];

        const checkbox = mainContent.querySelector<HTMLInputElement>(`#${providerName}`)!;

        const row = checkbox.closest('tr')!;
        const keyInput = row.querySelector<HTMLInputElement>('input[placeholder="API key (optional)"]')!;
        const urlInput = row.querySelector<HTMLInputElement>('input[placeholder="URL (optional)"]')!;

        checkbox.addEventListener('change', async (event) => {
            const isChecked = (event.target as HTMLInputElement).checked;
            aiProvider.enabled = isChecked;

            // Enable/disable key and url fields if checkbox is checked
            toggleFieldAtt(keyInput, isChecked);
            if (urlInput) {
                toggleFieldAtt(urlInput, isChecked);
            }
            // Reset key and url if checkbox is unchecked
            if (!isChecked) {
                keyInput.value = '';
                aiProvider.key = '';

                // For ollama restore default URL
                if (providerName === 'ollama') {
                    urlInput.value = OllamaProvider.defaultUrl;
                    aiProvider.url = OllamaProvider.defaultUrl;
                }
            }
            await storage.setItem<AiProvider>(`local:${providerName}`, aiProvider);
            await renderTable();
        });

        keyInput.addEventListener('input', async () => {
            aiProvider.key = keyInput.value;
            await storage.setItem<AiProvider>(`local:${providerName}`, aiProvider);
            await renderTable();

        });

        if (urlInput) {
            urlInput.addEventListener('input', async () => {
                aiProvider.url = urlInput.value;
                await storage.setItem<AiProvider>(`local:${providerName}`, aiProvider);
                await renderTable();

            });
        }
    });
}