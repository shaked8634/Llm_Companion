import TurndownService from 'turndown';

// Function to convert HTML to Markdown
export async function convertHtmlToMd(htmlElem: HTMLElement | string) {
    const ts = new TurndownService();
    return ts.turndown(htmlElem)
}