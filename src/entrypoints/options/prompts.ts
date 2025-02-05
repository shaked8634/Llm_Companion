import './style.css';
import {toggleFieldAtt} from "@/common/entrypoints";
import {DefaultSummarizePrompt, getAllPrompts, Prompt} from "@/components/prompts";

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
  const promptMappings = await getAllPrompts()

  mainContent.innerHTML = promptsHtmlTmpl(promptMappings[DefaultSummarizePrompt.Name]);

  const checkbox = mainContent.querySelector('#summarize')! as HTMLInputElement;
  const input = mainContent.querySelector('input[type="text"]')! as HTMLInputElement;

  checkbox.addEventListener('change', async (event) => {
    const isChecked = (event.target as HTMLInputElement).checked;
    toggleFieldAtt(input, isChecked);

    if (!isChecked) {
        input.value = DefaultSummarizePrompt.Prompt;
        promptMappings[DefaultSummarizePrompt.Name].prompt = DefaultSummarizePrompt.Prompt;
    }

    promptMappings[DefaultSummarizePrompt.Name].enabled = isChecked;
    await storage.setItem('local:prompts', JSON.stringify(promptMappings));
  });

  input.addEventListener('input', async () => {
    promptMappings[DefaultSummarizePrompt.Name].prompt = input.value;
    await storage.setItem('local:prompts', JSON.stringify(promptMappings));
  });
}