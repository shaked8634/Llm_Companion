import './style.css';
import {Prompt} from "@/common/types";
import {defaultSummarizePrompt} from "@/common/constants";

export const promptsHtmlTmpl = (summarize: Prompt) => `
 <table>
    <tbody>
      <tr>
        <td><input type="checkbox" class="prompt-checkbox" id="summarize" ${summarize.enabled ? 'checked' : ''}></td>
        <td>Summarize page</td>
        <td><input type="text" value="${summarize.prompt}" ${summarize.enabled ? '' : 'disabled'}></td>
      </tr>
    </tbody>
  </table>
`;

export async function handlePrompts(mainContent: HTMLElement): Promise<void> {
  const summarizePrompt: Prompt = await storage.getItem<Prompt>('local:summarizePrompt') || new Prompt(false, '', defaultSummarizePrompt);

  mainContent.innerHTML = promptsHtmlTmpl(summarizePrompt);

  const checkbox = mainContent.querySelector('#summarize')! as HTMLInputElement;
  const input = mainContent.querySelector('input[type="text"]')! as HTMLInputElement;

  checkbox.addEventListener('change', async (event) => {
    const isChecked = (event.target as HTMLInputElement).checked;
    input.disabled = !isChecked;
    input.style.opacity = isChecked ? '1' : '0.5';

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