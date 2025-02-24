import './style.css';
import {toggleFieldAtt} from "@/common/entrypoints";
import {SummarizePrompt, getPromptMappings, Prompt} from "@/components/prompts";
import {setItem, StorageKeys} from "@/common/storage";

export const promptsHtmlTmpl = (summarize: Prompt) => `
 <div class="section-container">
 <table class="sections-table">
    <tbody>
      <tr>
        <td><input type="checkbox" class="prompt-checkbox" id="summarize" ${summarize.enabled ? 'checked' : ''}></td>
        <td>Summarize page</td>
        <td><input type="text" value="${summarize.prompt}" ${summarize.enabled ? '' : 'disabled'}></td>
      </tr>
    </tbody>
  </table>
  </div>
`;

export async function handlePrompts(mainContent: HTMLElement): Promise<void> {
  const promptMappings = await getPromptMappings()

  mainContent.innerHTML = promptsHtmlTmpl(promptMappings[SummarizePrompt.Name]);

  const checkbox = mainContent.querySelector('#summarize')! as HTMLInputElement;
  const input = mainContent.querySelector('input[type="text"]')! as HTMLInputElement;

  checkbox.addEventListener('change', async (event) => {
    const isChecked = (event.target as HTMLInputElement).checked;
    toggleFieldAtt(input, isChecked);

    if (!isChecked) {
        input.value = SummarizePrompt.Prompt;
        promptMappings[SummarizePrompt.Name].prompt = SummarizePrompt.Prompt;
    }

    promptMappings[SummarizePrompt.Name].enabled = isChecked;
    await setItem(StorageKeys.PromptMappings, promptMappings);
  });

  input.addEventListener('input', async () => {
    promptMappings[SummarizePrompt.Name].prompt = input.value;
    await setItem(StorageKeys.PromptMappings, promptMappings);
  });
}