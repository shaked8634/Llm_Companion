import './style.css';
import logo from '@/assets/logo.svg';
import optionsGear from '@/assets/options_gear.svg';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="header">
    <img src="${logo}" alt="Logo" class="logo" />
    <h2 class="headline">LLM Companion</h2>
    <button id="open-options" class="options-button">
      <img src="${optionsGear}" alt="Options" class="gear-icon" />
    </button>
  </div>
`;

document.querySelector<HTMLButtonElement>('#open-options')!.addEventListener('click', () => {
  chrome.runtime.openOptionsPage().catch((err) => {
    console.error('Failed to open options page:', err);
  });
});
