import {Readability} from '@mozilla/readability';
import TurndownService from 'turndown';

export interface PageContent {
    title: string;
    content: string; // Markdown
    url: string;
    excerpt?: string;
}

export function extractPageContent(doc: Document): PageContent {
    // Clone the document to avoid modifying the original page
    const docClone = doc.cloneNode(true) as Document;
    const reader = new Readability(docClone);
    const article = reader.parse();

    if (!article) {
        throw new Error('Failed to parse page content');
    }

    const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
    });

    // Remove unwanted elements from the article content
    return {
        title: article.title || 'Untitled',
        content: turndown.turndown(article.content || ''),
        url: window.location.href,
        excerpt: article.excerpt || undefined
    };
}
