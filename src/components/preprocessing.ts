import TurndownService from 'turndown';

export async function convertHtmlToMd(htmlElem: HTMLElement) {
    const ts = new TurndownService();

    const markdown = ts.turndown(htmlElem)

    console.debug("Extracted markdown:", markdown)
    return markdown
}state:open