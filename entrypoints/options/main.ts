import './style.css';
import {defaultSummarizePrompt} from "@/common/constants";
import {AiProvider, Prompt} from "@/common/types";
import {defaultOllamaUrl, OllamaProvider} from "@/components/models/ollama";
import {OpenaiProvider} from "@/components/models/openai";
import {GeminiProvider} from "@/components/models/gemini";

const modelsHtmlTmpl = async (
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
        <td>${openai.enabled ? (openai.connected ? '<span style="color: green;">V</span>' : '<span style="color: red;">X</span>') : ''}</td>
      </tr>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="gemini" ${gemini.enabled ? 'checked' : ''}></td>
        <td>Google Gemini</td>
        <td><input type="text" placeholder="API key (optional)" value="${gemini.key}" ${gemini.enabled ? '' : 'disabled'}></td>
        <td>${gemini.enabled ? (gemini.connected ? '<span style="color: green;">V</span>' : '<span style="color: red;">X</span>') : ''}</td>

      </tr>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="ollama" ${ollama.enabled ? 'checked' : ''}></td>
        <td>Ollama</td>
        <td><input type="text" placeholder="API key (optional)" value="${ollama.key}" ${ollama.enabled ? '' : 'disabled'}></td>
        <td><input type="text" placeholder="URL (optional)" value="${ollama.url}" ${ollama.enabled ? '' : 'disabled'}></td>
        <td>${ollama.enabled ? (ollama.connected ? '<span style="color: green;">V</span>' : '<span style="color: red;">X</span>') : ''}</td>
      </tr>
    </tbody>
  </table>
`;

const promptsHtmlTmpl = (summarize: Prompt) => `
 <table>
    <tbody>
      <tr>
        <td><input type="checkbox" class="prompt-checkbox" id="summarize" ${summarize.enabled ? 'checked' : ''}></td>
        <td>Summarize page</td>
        <td><input type="text" value="${summarize.prompt}" disabled></td>
      </tr>
    </tbody>
  </table>
`;

const aboutHtml: string = `
  <h2>LLM Companion</h2>
  <h3>Support</h3> 
  <div>Code can be found at:  </div>
  <h3>Donation</h3> 
`;

document.body.innerHTML = `
  <div id="app">
    <div class="content">
      <div class="sidebar">
        <a href="#models" id="link-models" class="nav-link active">Models</a>
        <a href="#prompts" id="link-prompts" class="nav-link">Prompts</a>
        <a href="#about" id="link-about" class="nav-link">About</a>
      </div>
      <div class="main-content" id="main-content"></div>
    </div>
  </div>
`;

const updateMainContent = async (section: string) => {
    const mainContent = document.querySelector<HTMLDivElement>('#main-content')!;
    switch (section) {
        case 'models': {
            const openai = await storage.getItem<AiProvider>('local:openai') || new OpenaiProvider();
            const gemini = await storage.getItem<AiProvider>('local:gemini') || new GeminiProvider();
            const ollama = await storage.getItem<AiProvider>('local:ollama') || new OllamaProvider();

            try {
                openai.connected = await openai.isConnected();
                gemini.connected = await gemini.isConnected();
                ollama.connected = await ollama.isConnected();
            } catch (error) {
                console.error("Error checking Ollama connection:", error);
            }

            mainContent.innerHTML = await modelsHtmlTmpl(openai, gemini, ollama);

            const models = {openai, gemini, ollama};
            Object.keys(models).forEach((modelName) => {
                const aiProvider = models[modelName as keyof typeof models];
                const checkbox = mainContent.querySelector<HTMLInputElement>(`#${modelName}`)!;
                const row = checkbox.closest('tr')!;
                const keyInputField = row.querySelector<HTMLInputElement>('input[placeholder="API key (optional)"]')!;
                const urlInputField = row.querySelector<HTMLInputElement>('input[placeholder="URL (optional)"]')!;

                const toggleField = (field: HTMLInputElement, enabled: boolean) => {
                    field.disabled = !enabled;
                    field.style.opacity = enabled ? '1' : '0.5';
                };

                toggleField(keyInputField, aiProvider.enabled);
                if (urlInputField) {
                    toggleField(urlInputField, aiProvider.enabled);
                }

                checkbox.addEventListener('change', async (event) => {
                    const isChecked = (event.target as HTMLInputElement).checked;
                    aiProvider.enabled = isChecked;

                    toggleField(keyInputField, isChecked);
                    if (urlInputField) {
                        toggleField(urlInputField, isChecked);
                    }

                    if (!isChecked) {
                        keyInputField.value = '';
                        aiProvider.key = '';
                        if (modelName === 'ollama') {
                            urlInputField.value = defaultOllamaUrl;
                            aiProvider.url = defaultOllamaUrl;
                        }
                    }
                    await storage.setItem<AiProvider>(`local:${modelName}`, aiProvider);
                });

                keyInputField.addEventListener('input', async () => {
                    aiProvider.key = keyInputField.value;
                    await storage.setItem<AiProvider>(`local:${modelName}`, aiProvider);
                });

                if (urlInputField) {
                    urlInputField.addEventListener('input', async () => {
                        aiProvider.url = urlInputField.value;
                        await storage.setItem<AiProvider>(`local:${modelName}`, aiProvider);
                    });
                }
            });

            break;
        }
        case 'prompts': {
            const summarize = await storage.getItem<Prompt>('local:summarize') || {
                enabled: false,
                prompt: defaultSummarizePrompt
            };

            mainContent.innerHTML = promptsHtmlTmpl(summarize);

            const summarizeCheckbox = mainContent.querySelector<HTMLInputElement>('#summarize')!;
            const promptInput = mainContent.querySelector<HTMLInputElement>('input[type="text"]')!;

            promptInput.disabled = !summarize.enabled;
            promptInput.style.opacity = summarize.enabled ? '1' : '0.5';

            summarizeCheckbox.addEventListener('change', async (event) => {
                const isChecked = (event.target as HTMLInputElement).checked;
                promptInput.disabled = !isChecked;
                promptInput.style.opacity = isChecked ? '1' : '0.5';

                summarize.enabled = isChecked;

                if (!isChecked) {
                    promptInput.value = defaultSummarizePrompt;
                    summarize.prompt = defaultSummarizePrompt;
                }

                await storage.setItem<Prompt>('local:summarize', summarize);
            });

            promptInput.value = summarize.prompt;
            promptInput.addEventListener('input', async () => {
                summarize.prompt = promptInput.value;
                await storage.setItem<Prompt>('local:summarize', summarize);
            });

            break;
        }
        case 'about':
            mainContent.innerHTML = aboutHtml;
            break;
    }
};

updateMainContent('models');

const links = document.querySelectorAll<HTMLAnchorElement>('.nav-link');
links.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        links.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');

        const section = link.getAttribute('href')?.substring(1);
        updateMainContent(section || 'models');
    });
});
