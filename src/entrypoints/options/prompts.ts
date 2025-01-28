import './style.css';
import {toggleFieldAtt} from "@/common/entrypoints";
import {defaultSummarizePrompt, Prompt} from "@/components/prompts";

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
  const summarizeDate = await storage.getItem<Partial<Prompt>>('local:summarizePrompt');
  const summarizePrompt = summarizeDate ? Prompt.hydrate(summarizeDate) : new Prompt();

  mainContent.innerHTML = promptsHtmlTmpl(summarizePrompt);

  const checkbox = mainContent.querySelector('#summarize')! as HTMLInputElement;
  const input = mainContent.querySelector('input[type="text"]')! as HTMLInputElement;

  checkbox.addEventListener('change', async (event) => {
    const isChecked = (event.target as HTMLInputElement).checked;
    toggleFieldAtt(input, isChecked);

    if (!isChecked) {
        input.value = defaultSummarizePrompt;
        summarizePrompt.prompt = defaultSummarizePrompt;
    }

    summarizePrompt.enabled = isChecked;
    await storage.setItem<Prompt>('local:summarizePrompt', summarizePrompt);
  });

  input.addEventListener('input', async () => {
    summarizePrompt.prompt = input.value;
    await storage.setItem<Prompt>('local:summarizePrompt', summarizePrompt);
  });
}