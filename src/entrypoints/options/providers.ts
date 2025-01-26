import './style.css';
import {AiProvider} from "../../common/types";
import {OpenaiProvider} from "../../components/providers/openai";
import {GeminiProvider} from "../../components/providers/gemini";
import {OllamaProvider} from "../../components/providers/ollama";

async function checkProviderConnection(provider: AiProvider): Promise<boolean> {
    try {
        return await provider.isConnected();
    } catch (error) {
        console.error(`Error checking connection for ${provider.name}: ${error}`);
        return false;
    }
}

async function updateProviderConnectionStatus(provider: AiProvider): Promise<void> {
    const isConnected = await checkProviderConnection(provider);
    provider.connected = isConnected;
}

export async function updateProvidersConnectionStatus(providers: AiProvider[]): Promise<void> {
    await Promise.all(providers.map(updateProviderConnectionStatus));
}

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
      </tr>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="gemini" ${gemini.enabled ? 'checked' : ''}></td>
        <td>Google Gemini</td>
        <td><input type="text" placeholder="API key (optional)" value="${gemini.key}" ${gemini.enabled ? '' : 'disabled'}></td>
      </tr>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="ollama" ${ollama.enabled ? 'checked' : ''}></td>
        <td>Ollama</td>
        <td><input type="text" placeholder="API key (optional)" value="${ollama.key}" ${ollama.enabled ? '' : 'disabled'}></td>
        <td><input type="text" placeholder="URL (optional)" value="${ollama.url}" ${ollama.enabled ? '' : 'disabled'}></td>
      </tr>
    </tbody>
  </table>
`;

export const handleProviders = async (mainContent: HTMLElement): Promise<string> => {
    const openai = await storage.getItem<AiProvider>('local:openai') || new OpenaiProvider();
    const gemini = await storage.getItem<AiProvider>('local:gemini') || new GeminiProvider();
    const ollama = await storage.getItem<AiProvider>('local:ollama') || new OllamaProvider();

    // try {
    //     openai.connected = await openai.isConnected();
    //     gemini.connected = await gemini.isConnected();
    //     ollama.connected = await ollama.isConnected();
    // } catch (error) {
    //     console.error("Error checking Ollama connection:", error);
    // }

    const providers = {openai, gemini, ollama};
    // await updateProvidersConnectionStatus(providers);

    // Object.keys(providers).forEach((providerName) => {
    //     const aiProvider = providers[providerName as keyof typeof providers];
    //     // const checkbox = mainContent.querySelector<HTMLInputElement>(`#${providerName}`)!;
    //     const row = checkbox.closest('tr')!;
    //     const keyInputField = row.querySelector<HTMLInputElement>('input[placeholder="API key (optional)"]')!;
    //     const urlInputField = row.querySelector<HTMLInputElement>('input[placeholder="URL (optional)"]')!;
    //
    //     const toggleField = (field: HTMLInputElement, enabled: boolean) => {
    //         field.disabled = !enabled;
    //         field.style.opacity = enabled ? '1' : '0.5';
    //     };
    //
    //     if (aiProvider.enabled) {
    //         aiProvider.isConnected().then((connected) => aiProvider.connected = connected);
    //     }
    //
    //     toggleField(keyInputField, aiProvider.enabled);
    //     if (urlInputField) {
    //         toggleField(urlInputField, aiProvider.enabled);
    //     }

        // checkbox.addEventListener('change', async (event) => {
        //     const isChecked = (event.target as HTMLInputElement).checked;
        //     aiProvider.enabled = isChecked;
        //
        //     toggleField(keyInputField, isChecked);
        //     if (urlInputField) {
        //         toggleField(urlInputField, isChecked);
        //     }
        //
        //     if (!isChecked) {
        //         keyInputField.value = '';
        //         aiProvider.key = '';
        //         if (providerName === 'ollama') {
        //             urlInputField.value = defaultOllamaUrl;
        //             aiProvider.url = defaultOllamaUrl;
        //         }
        //     }
        //     await storage.setItem<AiProvider>(`local:${providerName}`, aiProvider);
        // });

    //     keyInputField.addEventListener('input', async () => {
    //         aiProvider.key = keyInputField.value;
    //         await storage.setItem<AiProvider>(`local:${providerName}`, aiProvider);
    //     });
    //
    //     if (urlInputField) {
    //         urlInputField.addEventListener('input', async () => {
    //             aiProvider.url = urlInputField.value;
    //             await storage.setItem<AiProvider>(`local:${providerName}`, aiProvider);
    //         });
    //     }
    // });
    return await providersHtmlTmpl(openai, gemini, ollama);
}