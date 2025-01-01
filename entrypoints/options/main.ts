import './style.css';

const defaultPrompt: string = "Summarize this page in less than 300 words";

const modelsHtmlTemplate = (
    openaiChecked: boolean,
    openaiApiKey: string,
    geminiChecked: boolean,
    geminiApiKey: string,
    ollamaChecked: boolean,
    ollamaApiKey: string) => `
  <table>
    <tbody>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="openai" ${openaiChecked ? 'checked' : ''}></td>
        <td>OpenAI</td>
        <td><input type="text" placeholder="API key (optional)" value="${openaiApiKey}" ${openaiApiKey ? '' : 'disabled'}></td>
      </tr>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="gemini" ${geminiChecked ? 'checked' : ''}></td>
        <td>Google Gemini</td>
        <td><input type="text" placeholder="API key (optional)" value="${geminiApiKey}" ${geminiApiKey ? '' : 'disabled'}></td>
      </tr>
      <tr>
        <td><input type="checkbox" class="model-checkbox" id="ollama" ${ollamaChecked ? 'checked' : ''}></td>
        <td>Ollama</td>
        <td><input type="text" value="${ollamaApiKey || 'http://localhost:114343'}" ${ollamaApiKey ? '' : 'disabled'}></td>
      </tr>
    </tbody>
  </table>
`;

const promptsHtml: string = `
 <table>
    <tbody>
      <tr>
        <td><input type="checkbox" class="prompt-checkbox"></td>
        <td>Summarize page</td>
        <td><input type="text" value="${defaultPrompt}" disabled></td>
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
      const openaiChecked = await storage.getItem<boolean>('local:openai_checked') || false;
      const openaiApiKey = await storage.getItem<string>('local:openai_apikey') || "";
      const geminiChecked = await storage.getItem<boolean>('local:gemini_checked') || false;
      const geminiApiKey = await storage.getItem<string>('local:gemini_apikey') || "";
      const ollamaChecked = await storage.getItem<boolean>('local:ollama_checked') || false;
      const ollamaApiKey = await storage.getItem<string>('local:ollama_apikey') || "";

      mainContent.innerHTML = modelsHtmlTemplate(
        openaiChecked,
        openaiApiKey,
        geminiChecked,
        geminiApiKey,
        ollamaChecked,
        ollamaApiKey
      );
      break;
    }
    case 'prompts':
      mainContent.innerHTML = promptsHtml;
      break;
    case 'about':
      mainContent.innerHTML = aboutHtml;
      break;
  }

  // Add event listeners to checkboxes
  const checkboxes = mainContent.querySelectorAll<HTMLInputElement>('.model-checkbox');
  checkboxes.forEach(checkbox => {
    const inputField = checkbox.closest('tr')?.querySelector<HTMLInputElement>('input[type="text"]')!;
    inputField.disabled = !checkbox.checked;
    inputField.style.opacity = checkbox.checked ? '1' : '0.5';

    checkbox.addEventListener('change', async (event) => {
      const isChecked = (event.target as HTMLInputElement).checked;
      inputField.disabled = !isChecked;
      inputField.style.opacity = isChecked ? '1' : '0.5';

      // Save the state to storage
      const modelName = checkbox.id; // Get the id of the checkbox
      await storage.setItem<boolean>(`local:${modelName}_checked`, isChecked);
      await storage.setItem<string>(`local:${modelName}_apikey`, isChecked ? inputField.value : ""); // Clear API key when unchecked
    });

    inputField.addEventListener('input', async () => {
      const apiKey = inputField.value; // Get the current value of the input field
      const modelName = checkbox.id; // Get the id of the checkbox
      await storage.setItem<string>(`local:${modelName}_apikey`, apiKey); // Save the API key on input change
    });
  });
};

// Initialize with the Models section
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