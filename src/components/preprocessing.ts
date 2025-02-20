import TurndownService from 'turndown';

// Function to convert HTML to Markdown
export async function convertHtmlToMd(htmlElem: HTMLElement | string) {
    const ts = new TurndownService();

    const markdown = ts.turndown(htmlElem)

    console.debug("Extracted markdown:", markdown)
    return markdown
}