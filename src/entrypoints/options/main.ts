import './style.css';
import {handleProviders,} from "@/entrypoints/options/providers";
import {aboutHtmlTmpl} from "@/entrypoints/options/about";
import {handlePrompts} from "@/entrypoints/options/prompts";

document.body.innerHTML = `
  <div id="app">
    <div class="content">
      <div class="sidebar">
        <a href="#providers" id="link-providers" class="nav-link active">Providers</a>
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
        case 'prompts': {
            await handlePrompts(mainContent);
            break;
        }
        case 'about':
            mainContent.innerHTML = aboutHtmlTmpl;
            break;
        default: // providers
            await handleProviders(mainContent)
            break;

    }
};

await updateMainContent('providers');

const links = document.querySelectorAll<HTMLAnchorElement>('.nav-link');
links.forEach((link) => {
    console.log("Link clicked:", link.getAttribute('href'));
    link.addEventListener('click', (event) => {
        event.preventDefault();
        links.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');

        const section = link.getAttribute('href')?.substring(1);
        updateMainContent(section || 'providers');
    });
});
